const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, EvernodeConstants, MemoFormats, MemoTypes, ErrorCodes } = require('../evernode-common');
const { XrplAccount } = require('../xrpl-account');
const { EncryptionHelper } = require('../encryption-helper');
const { Buffer } = require('buffer');
const codec = require('ripple-address-codec');
const { XflHelpers } = require('../xfl-helpers');
const { EvernodeHelpers } = require('../evernode-helpers');

const OFFER_WAIT_TIMEOUT = 60;

const HostEvents = {
    AcquireLease: EvernodeEvents.AcquireLease,
    ExtendLease: EvernodeEvents.ExtendLease
}

class HostClient extends BaseEvernodeClient {

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(HostEvents), true, options);
    }

    async getRegistrationNft() {
        // Find an owned NFT with matching Evernode host NFT prefix.
        const nft = (await this.xrplAcc.getNfts()).find(n => n.URI.startsWith(EvernodeConstants.NFT_PREFIX_HEX) && n.Issuer === this.registryAddress);
        if (nft) {
            // Check whether the token was actually issued from Evernode registry contract.
            const issuerHex = nft.NFTokenID.substr(8, 40);
            const issuerAddr = codec.encodeAccountID(Buffer.from(issuerHex, 'hex'));
            if (issuerAddr == this.registryAddress) {
                return nft;
            }
        }

        return null;
    }

    async getRegistration() {
        // Check whether we own an evernode host token.
        const nft = await this.getRegistrationNft();
        if (nft) {
            const host = await this.getHostInfo();
            return (host?.nfTokenId == nft.NFTokenID) ? host : null;
        }

        return null;
    }

    async getLeaseOffers() {
        return await EvernodeHelpers.getLeaseOffers(this.xrplAcc);
    }

    async cancelOffer(offerIndex) {
        return this.xrplAcc.cancelOffer(offerIndex);
    }

    async isRegistered() {
        return (await this.getRegistration()) !== null;
    }

    async prepareAccount(domain) {
        const [flags, trustLines, msgKey, curDomain] = await Promise.all([
            this.xrplAcc.getFlags(),
            this.xrplAcc.getTrustLines(EvernodeConstants.EVR, this.config.evrIssuerAddress),
            this.xrplAcc.getMessageKey(),
            this.xrplAcc.getDomain()]);

        let accountSetFields = {};
        accountSetFields = (!flags.lsfDefaultRipple) ? { ...accountSetFields, Flags: { asfDefaultRipple: true } } : accountSetFields;
        accountSetFields = (!msgKey) ? { ...accountSetFields, MessageKey: this.accKeyPair.publicKey } : accountSetFields;

        domain = domain.toLowerCase();
        accountSetFields = (!curDomain || curDomain !== domain) ?
            { ...accountSetFields, Domain: domain } : accountSetFields;

        if (Object.keys(accountSetFields).length !== 0)
            await this.xrplAcc.setAccountFields(accountSetFields);

        if (trustLines.length === 0)
            await this.xrplAcc.setTrustLine(EvernodeConstants.EVR, this.config.evrIssuerAddress, "99999999999999");
    }

    async offerLease(leaseIndex, leaseAmount, tosHash) {
        // <prefix><lease index 16)><half of tos hash><lease amount (uint32)>
        const prefixLen = EvernodeConstants.LEASE_NFT_PREFIX_HEX.length / 2;
        const halfToSLen = tosHash.length / 4;
        const uriBuf = Buffer.allocUnsafe(prefixLen + halfToSLen + 10);
        Buffer.from(EvernodeConstants.LEASE_NFT_PREFIX_HEX, 'hex').copy(uriBuf);
        uriBuf.writeUInt16BE(leaseIndex, prefixLen);
        Buffer.from(tosHash, 'hex').copy(uriBuf, prefixLen + 2, 0, halfToSLen);
        uriBuf.writeBigInt64BE(XflHelpers.getXfl(leaseAmount.toString()), prefixLen + 2 + halfToSLen);
        const uri = uriBuf.toString('hex').toUpperCase();

        await this.xrplAcc.mintNft(uri, 0, 0, { isBurnable: true, isHexUri: true });

        const nft = await this.xrplAcc.getNftByUri(uri, true);
        if (!nft)
            throw "Offer lease NFT creation error.";

        await this.xrplAcc.offerSellNft(nft.NFTokenID,
            leaseAmount.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress);
    }

    async expireLease(nfTokenId, tenantAddress = null) {
        await this.xrplAcc.burnNft(nfTokenId, tenantAddress);
    }

    async register(countryCode, cpuMicroSec, ramMb, diskMb, totalInstanceCount, cpuModel, cpuCount, cpuSpeed, description, options = {}) {
        if (!/^([A-Z]{2})$/.test(countryCode))
            throw "countryCode should consist of 2 uppercase alphabetical characters";
        else if (!cpuMicroSec || isNaN(cpuMicroSec) || cpuMicroSec % 1 != 0 || cpuMicroSec < 0)
            throw "cpuMicroSec should be a positive integer";
        else if (!ramMb || isNaN(ramMb) || ramMb % 1 != 0 || ramMb < 0)
            throw "ramMb should be a positive integer";
        else if (!diskMb || isNaN(diskMb) || diskMb % 1 != 0 || diskMb < 0)
            throw "diskMb should be a positive integer";
        else if (!totalInstanceCount || isNaN(totalInstanceCount) || totalInstanceCount % 1 != 0 || totalInstanceCount < 0)
            throw "totalInstanceCount should be a positive intiger";
        else if (!cpuCount || isNaN(cpuCount) || cpuCount % 1 != 0 || cpuCount < 0)
            throw "CPU count should be a positive integer";
        else if (!cpuSpeed || isNaN(cpuSpeed) || cpuSpeed % 1 != 0 || cpuSpeed < 0)
            throw "CPU speed should be a positive integer";
        else if (!cpuModel)
            throw "cpu model cannot be empty";

        // Need to use control characters inside this regex to match ascii characters.
        // Here we allow all the characters in ascii range except ";" for the description.
        // no-control-regex is enabled default by eslint:recommended, So we disable it only for next line.
        // eslint-disable-next-line no-control-regex
        else if (!/^((?![;])[\x00-\x7F]){0,26}$/.test(description))
            throw "description should consist of 0-26 ascii characters except ';'";

        if (await this.isRegistered())
            throw "Host already registered.";

        // Check whether is there any missed NFT sell offer that needs to be accepted
        // from the client-side in order to complete the registration.
        const regNft = await this.getRegistrationNft();
        if (!regNft) {
            const regInfo = await this.getHostInfo(this.xrplAcc.address);
            if (regInfo) {
                const registryAcc = new XrplAccount(this.registryAddress, null, { xrplApi: this.xrplApi });
                const sellOffer = (await registryAcc.getNftOffers()).find(o => o.NFTokenID == regInfo.nfTokenId);
                if (sellOffer) {
                    await this.xrplAcc.buyNft(sellOffer.index);
                    console.log("Registration was successfully completed after acquiring the NFT.");
                    return await this.isRegistered();
                }
            }
        }

        const memoData = `${countryCode};${cpuMicroSec};${ramMb};${diskMb};${totalInstanceCount};${cpuModel};${cpuCount};${cpuSpeed};${description}`
        const tx = await this.xrplAcc.makePayment(this.registryAddress,
            this.config.hostRegFee.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [{ type: MemoTypes.HOST_REG, format: MemoFormats.TEXT, data: memoData }],
            options.transactionOptions);

        console.log('Waiting for the sell offer')
        const regAcc = new XrplAccount(this.registryAddress, null, { xrplApi: this.xrplApi });
        let offer = null;
        let attempts = 0;
        let offerLedgerIndex = 0;
        while (attempts < OFFER_WAIT_TIMEOUT) {
            const nft = (await regAcc.getNfts()).find(n => n.URI === `${EvernodeConstants.NFT_PREFIX_HEX}${tx.id}`);
            if (nft) {
                offer = (await regAcc.getNftOffers()).find(o => o.Destination === this.xrplAcc.address && o.NFTokenID === nft.NFTokenID && o.Flags === 1);
                offerLedgerIndex = this.xrplApi.ledgerIndex;
                if (offer)
                    break;
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }

        }
        if (!offer)
            throw 'No sell offer found within timeout.';

        console.log('Accepting the sell offer..');

        // Wait until the next ledger after the offer is created.
        // Otherwise if the offer accepted in the same legder which it's been created,
        // We cannot fetch the offer from registry contract event handler since it's getting deleted immediately.
        await new Promise(async resolve => {
            while (this.xrplApi.ledgerIndex <= offerLedgerIndex)
                await new Promise(resolve2 => setTimeout(resolve2, 1000));
            resolve();
        });

        await this.xrplAcc.buyNft(offer.index);

        return await this.isRegistered();
    }

    async deregister(options = {}) {

        if (!(await this.isRegistered()))
            throw "Host not registered."

        const regNFT = await this.getRegistrationNft();
        await this.xrplAcc.makePayment(this.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [{ type: MemoTypes.HOST_DEREG, format: MemoFormats.HEX, data: regNFT.NFTokenID }],
            options.transactionOptions);

        console.log('Waiting for the buy offer')
        const regAcc = new XrplAccount(this.registryAddress, null, { xrplApi: this.xrplApi });
        let offer = null;
        let attempts = 0;
        let offerLedgerIndex = 0;
        while (attempts < OFFER_WAIT_TIMEOUT) {
            offer = (await regAcc.getNftOffers()).find(o => (o.NFTokenID == regNFT.NFTokenID) && (o.Flags === 0));
            offerLedgerIndex = this.xrplApi.ledgerIndex;
            if (offer)
                break;
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        if (!offer)
            throw 'No buy offer found within timeout.';

        console.log('Accepting the buy offer..');

        // Wait until the next ledger after the offer is created.
        // Otherwise if the offer accepted in the same legder which it's been created,
        // We cannot fetch the offer from registry contract event handler since it's getting deleted immediately.
        await new Promise(async resolve => {
            while (this.xrplApi.ledgerIndex <= offerLedgerIndex)
                await new Promise(resolve2 => setTimeout(resolve2, 1000));
            resolve();
        });

        await this.xrplAcc.sellNft(
            offer.index,
            [{ type: MemoTypes.HOST_POST_DEREG, format: MemoFormats.HEX, data: regNFT.NFTokenID }]
        );

        return await this.isRegistered();
    }

    async updateRegInfo(activeInstanceCount = null, version = null, totalInstanceCount = null, tokenID = null, countryCode = null, cpuMicroSec = null, ramMb = null, diskMb = null, description = null, options = {}) {
        const dataStr = `${tokenID ? tokenID : ''};${countryCode ? countryCode : ''};${cpuMicroSec ? cpuMicroSec : ''};${ramMb ? ramMb : ''};${diskMb ? diskMb : ''};${totalInstanceCount ? totalInstanceCount : ''};${activeInstanceCount !== undefined ? activeInstanceCount : ''};${description ? description : ''};${version ? version : ''}`;
        return await this.xrplAcc.makePayment(this.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [{ type: MemoTypes.HOST_UPDATE_INFO, format: MemoFormats.TEXT, data: dataStr }],
            options.transactionOptions);
    }

    async heartbeat(options = {}) {
        return this.xrplAcc.makePayment(this.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [{ type: MemoTypes.HEARTBEAT, format: "", data: "" }],
            options.transactionOptions);
    }

    async acquireSuccess(txHash, tenantAddress, instanceInfo, options = {}) {

        // Encrypt the instance info with the tenant's encryption key (Specified in MessageKey field of the tenant account).
        const tenantAcc = new XrplAccount(tenantAddress, null, { xrplApi: this.xrplApi });
        const encKey = await tenantAcc.getMessageKey();
        if (!encKey)
            throw "Tenant encryption key not set.";

        const encrypted = await EncryptionHelper.encrypt(encKey, instanceInfo);
        const memos = [
            { type: MemoTypes.ACQUIRE_SUCCESS, format: MemoFormats.BASE64, data: encrypted },
            { type: MemoTypes.ACQUIRE_REF, format: MemoFormats.HEX, data: txHash }];

        return this.xrplAcc.makePayment(tenantAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            memos,
            options.transactionOptions);
    }

    async acquireError(txHash, tenantAddress, leaseAmount, reason, options = {}) {

        const memos = [
            { type: MemoTypes.ACQUIRE_ERROR, format: MemoFormats.JSON, data: { type: ErrorCodes.ACQUIRE_ERR, reason: reason } },
            { type: MemoTypes.ACQUIRE_REF, format: MemoFormats.HEX, data: txHash }];

        return this.xrplAcc.makePayment(tenantAddress,
            leaseAmount.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            memos,
            options.transactionOptions);
    }

    async extendSuccess(txHash, tenantAddress, expiryMoment, options = {}) {
        let buf = Buffer.allocUnsafe(4);
        buf.writeUInt32BE(expiryMoment);

        const memos = [
            { type: MemoTypes.EXTEND_SUCCESS, format: MemoFormats.HEX, data: buf.toString('hex') },
            { type: MemoTypes.EXTEND_REF, format: MemoFormats.HEX, data: txHash }];

        return this.xrplAcc.makePayment(tenantAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            memos,
            options.transactionOptions);
    } 

    async extendError(txHash, tenantAddress, reason, refund, options = {}) {

        const memos = [
            { type: MemoTypes.EXTEND_ERROR, format: MemoFormats.JSON, data: { type: ErrorCodes.EXTEND_ERR, reason: reason } },
            { type: MemoTypes.EXTEND_REF, format: MemoFormats.HEX, data: txHash }];

        // Required to refund the paid EVR amount as the offer extention is not successfull.
        return this.xrplAcc.makePayment(tenantAddress,
            refund.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            memos,
            options.transactionOptions);
    }

    async refundTenant(txHash, tenantAddress, refundAmount, options = {}) {
        const memos = [
            { type: MemoTypes.REFUND, format: '', data: '' },
            { type: MemoTypes.REFUND_REF, format: MemoFormats.HEX, data: txHash }];

        return this.xrplAcc.makePayment(tenantAddress,
            refundAmount.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            memos,
            options.transactionOptions);
    }

    getLeaseNFTokenIdPrefix() {
        let buf = Buffer.allocUnsafe(24);
        buf.writeUInt16BE(1);
        buf.writeUInt16BE(0, 2);
        codec.decodeAccountID(this.xrplAcc.address).copy(buf, 4);
        return buf.toString('hex');
    }
}

module.exports = {
    HostEvents,
    HostClient
}
const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, EvernodeConstants, MemoFormats, MemoTypes, ErrorCodes } = require('../evernode-common');
const { XrplAccount } = require('../xrpl-account');
const { EncryptionHelper } = require('../encryption-helper');
const { Buffer } = require('buffer');
const codec = require('ripple-address-codec');
const { XflHelpers } = require('../xfl-helpers');

const OFFER_WAIT_TIMEOUT = 60;

const HostEvents = {
    AcquireLease: EvernodeEvents.AcquireLease,
    NftOfferCreate: EvernodeEvents.NftOfferCreate,
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
            const host = await this.getHosts({ nfTokenId: nft.NFTokenID });
            if (host && host.length == 1)
                return host[0];
        }

        return null;
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

    async register(countryCode, cpuMicroSec, ramMb, diskMb, totalInstanceCount, description, options = {}) {
        if (!/^([A-Z]{2})$/.test(countryCode))
            throw "countryCode should consist of 2 uppercase alphabetical characters";
        else if (!cpuMicroSec || isNaN(cpuMicroSec) || cpuMicroSec % 1 != 0 || cpuMicroSec < 0)
            throw "cpuMicroSec should be a positive intiger";
        else if (!ramMb || isNaN(ramMb) || ramMb % 1 != 0 || ramMb < 0)
            throw "ramMb should be a positive intiger";
        else if (!diskMb || isNaN(diskMb) || diskMb % 1 != 0 || diskMb < 0)
            throw "diskMb should be a positive intiger";
        else if (!totalInstanceCount || isNaN(totalInstanceCount) || totalInstanceCount % 1 != 0 || totalInstanceCount < 0)
            throw "totalInstanceCount should be a positive intiger";
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
            const regInfo = await this.getHosts({ address: this.xrplAcc.address });
            if (regInfo.length !== 0) {
                const registryAcc = new XrplAccount(this.registryAddress, null, { xrplApi: this.xrplApi });
                const sellOffer = (await registryAcc.getNftOffers()).find(o => o.NFTokenID == regInfo[0].nfTokenId);
                if (sellOffer) {
                    await this.xrplAcc.buyNft(sellOffer.index);
                    console.log("Registration was successfully completed after acquiring the NFT.");
                    return await this.isRegistered();
                }
            }
        }

        const memoData = `${countryCode};${cpuMicroSec};${ramMb};${diskMb};${totalInstanceCount};${description}`
        const tx = await this.xrplAcc.makePayment(this.registryAddress,
            this.config.hostRegFee.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [{ type: MemoTypes.HOST_REG, format: MemoFormats.TEXT, data: memoData }],
            options.transactionOptions);

        // Added this attribute as an indication for the sell offer acceptance
        tx.isSellOfferAccepted = false;

        this.on(HostEvents.NftOfferCreate, r => this.handleNftOffer(r, tx));

        let attemps = 0;

        while (attemps < OFFER_WAIT_TIMEOUT) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (tx.isSellOfferAccepted) {
                break;
            }
            attemps++;
        }

        if (!tx.isSellOfferAccepted)
            throw "No sell offer was found within timeout.";

        return await this.isRegistered();
    }

    async handleNftOffer(r, tx) {
        if (this.xrplAcc.address === r.transaction.Destination) {
            const registryAcc = new XrplAccount(this.registryAddress, null, { xrplApi: this.xrplApi });
            const nft = (await registryAcc.getNfts()).find(n => n.URI === `${EvernodeConstants.NFT_PREFIX_HEX}${tx.id}`);
            if (nft) {
                const sellOffer = (await registryAcc.getNftOffers()).find(o => o.NFTokenID === nft.NFTokenID && o.Flags === 1);
                if (sellOffer) {
                    await this.xrplAcc.buyNft(sellOffer.index);
                    tx.isSellOfferAccepted = true;
                }
            }
        }
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
            throw 'No offer found within timeout.';

        console.log('Accepting buy offer..');

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
}

module.exports = {
    HostEvents,
    HostClient
}
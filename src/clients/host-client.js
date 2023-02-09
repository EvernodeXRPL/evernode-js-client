const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, EvernodeConstants, MemoFormats, MemoTypes, ErrorCodes } = require('../evernode-common');
const { XrplAccount } = require('../xrpl-account');
const { EncryptionHelper } = require('../encryption-helper');
const { Buffer } = require('buffer');
const codec = require('ripple-address-codec');
const { XflHelpers } = require('../xfl-helpers');
const { EvernodeHelpers } = require('../evernode-helpers');
const { StateHelpers } = require('../state-helpers');
const { sha512Half } = require('xrpl-binary-codec/dist/hashes');
const { HookHelpers } = require('../hook-helpers');

const OFFER_WAIT_TIMEOUT = 60;

const HostEvents = {
    AcquireLease: EvernodeEvents.AcquireLease,
    ExtendLease: EvernodeEvents.ExtendLease
}

const HOST_COUNTRY_CODE_MEMO_OFFSET = 0;
const HOST_CPU_MICROSEC_MEMO_OFFSET = 2;
const HOST_RAM_MB_MEMO_OFFSET = 6;
const HOST_DISK_MB_MEMO_OFFSET = 10;
const HOST_TOT_INS_COUNT_MEMO_OFFSET = 14;
const HOST_CPU_MODEL_NAME_MEMO_OFFSET = 18;
const HOST_CPU_COUNT_MEMO_OFFSET = 58;
const HOST_CPU_SPEED_MEMO_OFFSET = 60;
const HOST_DESCRIPTION_MEMO_OFFSET = 62;
const HOST_EMAIL_ADDRESS_MEMO_OFFSET = 88;
const HOST_REG_MEMO_SIZE = 128;

const HOST_UPDATE_TOKEN_ID_MEMO_OFFSET = 0;
const HOST_UPDATE_COUNTRY_CODE_MEMO_OFFSET = 32;
const HOST_UPDATE_CPU_MICROSEC_MEMO_OFFSET = 34;
const HOST_UPDATE_RAM_MB_MEMO_OFFSET = 38;
const HOST_UPDATE_DISK_MB_MEMO_OFFSET = 42;
const HOST_UPDATE_TOT_INS_COUNT_MEMO_OFFSET = 46;
const HOST_UPDATE_ACT_INS_COUNT_MEMO_OFFSET = 50;
const HOST_UPDATE_DESCRIPTION_MEMO_OFFSET = 54;
const HOST_UPDATE_VERSION_MEMO_OFFSET = 80;
const HOST_UPDATE_MEMO_SIZE = 83;

const PROPOSE_UNIQUE_ID_MEMO_OFFSET = 0;
const PROPOSE_SHORT_NAME_MEMO_OFFSET = 32;
const PROPOSE_KEYLETS_MEMO_OFFSET = 52;
const PROPOSE_MEMO_SIZE = 154;

class HostClient extends BaseEvernodeClient {

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(HostEvents), true, options);
    }

    async getRegistrationNft() {
        // Find an owned NFT with matching Evernode host NFT prefix.
        const nft = (await this.xrplAcc.getNfts()).find(n => n.URI.startsWith(EvernodeConstants.NFT_PREFIX_HEX) && n.Issuer === this.config.registryAddress);
        if (nft) {
            // Check whether the token was actually issued from Evernode registry contract.
            const issuerHex = nft.NFTokenID.substr(8, 40);
            const issuerAddr = codec.encodeAccountID(Buffer.from(issuerHex, 'hex'));
            if (issuerAddr == this.config.registryAddress) {
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

    async register(countryCode, cpuMicroSec, ramMb, diskMb, totalInstanceCount, cpuModel, cpuCount, cpuSpeed, description, emailAddress, options = {}) {
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

        else if (!emailAddress || !(/[a-z0-9]+@[a-z]+.[a-z]{2,3}/.test(emailAddress)) || (emailAddress.length > 40))
            throw "Email address should be valid and can not have more than 40 characters.";

        if (await this.isRegistered())
            throw "Host already registered.";

        // Check whether is there any missed NFT sell offer that needs to be accepted
        // from the client-side in order to complete the registration.
        const registryAcc = new XrplAccount(this.config.registryAddress, null, { xrplApi: this.xrplApi });
        const regNft = await this.getRegistrationNft();
        if (!regNft) {
            const regInfo = await this.getHostInfo(this.xrplAcc.address);
            if (regInfo) {
                const sellOffer = (await registryAcc.getNftOffers()).find(o => o.NFTokenID == regInfo.nfTokenId);
                if (sellOffer) {
                    await this.xrplAcc.buyNft(sellOffer.index);
                    console.log("Registration was successfully completed after acquiring the NFT.");
                    return await this.isRegistered();
                }
            }
        }

        // Check the availability of an initiated transfer.
        // Need to modify the amount accordingly.
        const stateTransfereeAddrKey = StateHelpers.generateTransfereeAddrStateKey(this.xrplAcc.address);
        const stateTransfereeAddrIndex = StateHelpers.getHookStateIndex(this.governorAddress, stateTransfereeAddrKey);
        let transfereeAddrLedgerEntry = {};
        let transfereeAddrStateData = {};
        let transferredNFTokenId = null;

        try {
            const res = await this.xrplApi.getLedgerEntry(stateTransfereeAddrIndex);
            transfereeAddrLedgerEntry = { ...transfereeAddrLedgerEntry, ...res };
            transfereeAddrStateData = transfereeAddrLedgerEntry?.HookStateData;
            const transfereeAddrStateDecoded = StateHelpers.decodeTransfereeAddrState(Buffer.from(stateTransfereeAddrKey, 'hex'), Buffer.from(transfereeAddrStateData, 'hex'));
            transferredNFTokenId = transfereeAddrStateDecoded?.transferredNfTokenId;

        }
        catch (e) {
            console.log("No initiated transfers were found.");
        }

        // <country_code(2)><cpu_microsec(4)><ram_mb(4)><disk_mb(4)><no_of_total_instances(4)><cpu_model(40)><cpu_count(2)><cpu_speed(2)><description(26)><email_address(40)>
        const memoBuf = Buffer.alloc(HOST_REG_MEMO_SIZE, 0);
        Buffer.from(countryCode.substr(0, 2), "utf-8").copy(memoBuf, HOST_COUNTRY_CODE_MEMO_OFFSET);
        memoBuf.writeUInt32BE(cpuMicroSec, HOST_CPU_MICROSEC_MEMO_OFFSET);
        memoBuf.writeUInt32BE(ramMb, HOST_RAM_MB_MEMO_OFFSET);
        memoBuf.writeUInt32BE(diskMb, HOST_DISK_MB_MEMO_OFFSET);
        memoBuf.writeUInt32BE(totalInstanceCount, HOST_TOT_INS_COUNT_MEMO_OFFSET);
        Buffer.from(cpuModel.substr(0, 40), "utf-8").copy(memoBuf, HOST_CPU_MODEL_NAME_MEMO_OFFSET);
        memoBuf.writeUInt16BE(cpuCount, HOST_CPU_COUNT_MEMO_OFFSET);
        memoBuf.writeUInt16BE(cpuSpeed, HOST_CPU_SPEED_MEMO_OFFSET);
        Buffer.from(description.substr(0, 26), "utf-8").copy(memoBuf, HOST_DESCRIPTION_MEMO_OFFSET);
        Buffer.from(emailAddress.substr(0, 40), "utf-8").copy(memoBuf, HOST_EMAIL_ADDRESS_MEMO_OFFSET);

        const tx = await this.xrplAcc.makePayment(this.config.registryAddress,
            (transferredNFTokenId) ? EvernodeConstants.NOW_IN_EVRS : this.config.hostRegFee.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [{ type: MemoTypes.HOST_REG, format: MemoFormats.HEX, data: memoBuf.toString('hex') }],
            options.transactionOptions);

        console.log('Waiting for the sell offer')
        let offer = null;
        let attempts = 0;
        let offerLedgerIndex = 0;
        while (attempts < OFFER_WAIT_TIMEOUT) {
            const nft = (await registryAcc.getNfts()).find(n => (n.URI === `${EvernodeConstants.NFT_PREFIX_HEX}${tx.id}`) || (n.NFTokenID === transferredNFTokenId));
            if (nft) {
                offer = (await registryAcc.getNftOffers()).find(o => o.Destination === this.xrplAcc.address && o.NFTokenID === nft.NFTokenID && o.Flags === 1);
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

        // To obtain registration NFT Page Keylet and index.
        const nftPageDataBuf = await EvernodeHelpers.getNFTPageAndLocation(regNFT.NFTokenID, this.xrplAcc, this.xrplApi);

        await this.xrplAcc.makePayment(this.config.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [
                { type: MemoTypes.HOST_DEREG, format: MemoFormats.HEX, data: regNFT.NFTokenID },
                { type: MemoTypes.HOST_REGISTRY_REF, format: MemoFormats.HEX, data: nftPageDataBuf.toString('hex') }
            ],
            options.transactionOptions);

        console.log('Waiting for the buy offer')
        const regAcc = new XrplAccount(this.config.registryAddress, null, { xrplApi: this.xrplApi });
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
        // <token_id(32)><country_code(2)><cpu_microsec(4)><ram_mb(4)><disk_mb(4)><total_instance_count(4)><active_instances(4)><description(26)><version(3)>
        const memoBuf = Buffer.alloc(HOST_UPDATE_MEMO_SIZE, 0);
        if (tokenID)
            Buffer.from(tokenID.substr(0, 32), "hex").copy(memoBuf, HOST_UPDATE_TOKEN_ID_MEMO_OFFSET);
        if (countryCode)
            Buffer.from(countryCode.substr(0, 2), "utf-8").copy(memoBuf, HOST_UPDATE_COUNTRY_CODE_MEMO_OFFSET);
        if (cpuMicroSec)
            memoBuf.writeUInt32BE(cpuMicroSec, HOST_UPDATE_CPU_MICROSEC_MEMO_OFFSET);
        if (ramMb)
            memoBuf.writeUInt32BE(ramMb, HOST_UPDATE_RAM_MB_MEMO_OFFSET);
        if (diskMb)
            memoBuf.writeUInt32BE(diskMb, HOST_UPDATE_DISK_MB_MEMO_OFFSET);
        if (totalInstanceCount)
            memoBuf.writeUInt32BE(totalInstanceCount, HOST_UPDATE_TOT_INS_COUNT_MEMO_OFFSET);
        if (activeInstanceCount)
            memoBuf.writeUInt32BE(activeInstanceCount, HOST_UPDATE_ACT_INS_COUNT_MEMO_OFFSET);
        if (description)
            Buffer.from(description.substr(0, 26), "utf-8").copy(memoBuf, HOST_UPDATE_DESCRIPTION_MEMO_OFFSET);
        if (version) {
            const components = version.split('.').map(v => parseInt(v));
            if (components.length != 3)
                throw 'Invalid version format.';
            memoBuf.writeUInt8(components[0], HOST_UPDATE_VERSION_MEMO_OFFSET);
            memoBuf.writeUInt8(components[1], HOST_UPDATE_VERSION_MEMO_OFFSET + 1);
            memoBuf.writeUInt8(components[2], HOST_UPDATE_VERSION_MEMO_OFFSET + 2);
        }

        // To obtain registration NFT Page Keylet and index.
        if (!tokenID)
            tokenID = (await this.getRegistrationNft()).NFTokenID;
        const nftPageDataBuf = await EvernodeHelpers.getNFTPageAndLocation(tokenID, this.xrplAcc, this.xrplApi);

        return await this.xrplAcc.makePayment(this.config.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [
                { type: MemoTypes.HOST_UPDATE_INFO, format: MemoFormats.HEX, data: memoBuf.toString('hex') },
                { type: MemoTypes.HOST_REGISTRY_REF, format: MemoFormats.HEX, data: nftPageDataBuf.toString('hex') }
            ],
            options.transactionOptions);
    }

    async heartbeat(options = {}) {
        // To obtain registration NFT Page Keylet and index.
        const regNFT = await this.getRegistrationNft();
        const nftPageDataBuf = await EvernodeHelpers.getNFTPageAndLocation(regNFT.NFTokenID, this.xrplAcc, this.xrplApi);

        return this.xrplAcc.makePayment(this.config.heartbeatAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [
                { type: MemoTypes.HEARTBEAT, format: "", data: "" },
                { type: MemoTypes.HOST_REGISTRY_REF, format: MemoFormats.HEX, data: nftPageDataBuf.toString('hex') }
            ],
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

    async requestRebate(options = {}) {

        // To obtain registration NFT Page Keylet and index.
        const regNFT = await this.getRegistrationNft();
        const nftPageDataBuf = await EvernodeHelpers.getNFTPageAndLocation(regNFT.NFTokenID, this.xrplAcc, this.xrplApi);

        return this.xrplAcc.makePayment(this.config.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [
                { type: MemoTypes.HOST_REBATE, format: "", data: "" },
                { type: MemoTypes.HOST_REGISTRY_REF, format: MemoFormats.HEX, data: nftPageDataBuf.toString('hex') }
            ],
            options.transactionOptions);
    }

    async propose(hashes, shortName, options = {}) {
        const hashesBuf = Buffer.from(hashes, 'hex');
        if (!hashesBuf || hashesBuf.length != 96)
            throw 'Invalid hashes: Hashes should contain all three Governor, Registry, Heartbeat hook hashes.';

        // Check whether hook hashes exist in the definition.
        let keylets = [];
        for (const [i, hook] of EvernodeConstants.HOOKS.entries()) {
            const index = HookHelpers.getHookDefinitionIndex(hashes.substr(i * 64, 64));
            const ledgerEntry = await this.xrplApi.getLedgerEntry(index);
            if (!ledgerEntry)
                throw `No hook exists with the specified ${hook} hook hash.`;
            else
                keylets.push(HookHelpers.getHookDefinitionKeylet(index));
        }

        const uniqueId = sha512Half(hashesBuf);
        const memoBuf = Buffer.alloc(PROPOSE_MEMO_SIZE);
        Buffer.from(uniqueId.slice(0, 32)).copy(memoBuf, PROPOSE_UNIQUE_ID_MEMO_OFFSET);
        Buffer.from(shortName.substr(0, 20), "utf-8").copy(memoBuf, PROPOSE_SHORT_NAME_MEMO_OFFSET);
        Buffer.from(keylets.join(''), 'hex').copy(memoBuf, PROPOSE_KEYLETS_MEMO_OFFSET);

        // Get the proposal fee. Proposal fee is current epochs moment worth of rewards.
        const proposalFee = EvernodeHelpers.getEpochRewardQuota(this.config.rewardInfo.epoch, this.config.rewardConfiguration.firstEpochRewardQuota)

        return await this.xrplAcc.makePayment(this.governorAddress,
            proposalFee.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [
                { type: MemoTypes.PROPOSE, format: MemoFormats.HEX, data: hashesBuf.toString('hex').toUpperCase() },
                { type: MemoTypes.PROPOSE_REF, format: MemoFormats.HEX, data: memoBuf.toString('hex').toUpperCase() }
            ],
            options.transactionOptions);
    }

    getLeaseNFTokenIdPrefix() {
        let buf = Buffer.allocUnsafe(24);
        buf.writeUInt16BE(1);
        buf.writeUInt16BE(0, 2);
        codec.decodeAccountID(this.xrplAcc.address).copy(buf, 4);
        return buf.toString('hex');
    }

    async transfer(transfereeAddress = this.xrplAcc.address, options = {}) {
        if (!(await this.isRegistered()))
            throw "Host is not registered.";

        const transfereeAcc = new XrplAccount(transfereeAddress, null, { xrplApi: this.xrplApi });

        if (this.xrplAcc.address !== transfereeAddress) {
            // Find the new transferee also owns an Evernode Host Registration NFT.
            const nft = (await transfereeAcc.getNfts()).find(n => n.URI.startsWith(EvernodeConstants.NFT_PREFIX_HEX) && n.Issuer === this.config.registryAddress);
            if (nft) {
                // Check whether the token was actually issued from Evernode registry contract.
                const issuerHex = nft.NFTokenID.substr(8, 40);
                const issuerAddr = codec.encodeAccountID(Buffer.from(issuerHex, 'hex'));
                if (issuerAddr == this.config.registryAddress) {
                    throw "The transferee is already registered in Evernode.";
                }
            }
        }

        let memoData = Buffer.allocUnsafe(20);
        codec.decodeAccountID(transfereeAddress).copy(memoData);

        // To obtain registration NFT Page Keylet and index.
        const regNFT = await this.getRegistrationNft();
        const nftPageDataBuf = await EvernodeHelpers.getNFTPageAndLocation(regNFT.NFTokenID, this.xrplAcc, this.xrplApi);

        await this.xrplAcc.makePayment(this.config.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [
                { type: MemoTypes.HOST_TRANSFER, format: MemoFormats.HEX, data: memoData.toString('hex') },
                { type: MemoTypes.HOST_REGISTRY_REF, format: MemoFormats.HEX, data: nftPageDataBuf.toString('hex') }
            ],
            options.transactionOptions);

        let offer = null;
        let attempts = 0;
        let offerLedgerIndex = 0;
        const regAcc = new XrplAccount(this.config.registryAddress, null, { xrplApi: this.xrplApi });

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

        await this.xrplAcc.sellNft(offer.index);
    }

    async isTransferee() {

        // Check the availability of TRANSFEREE state for this host address.
        const stateTransfereeAddrKey = StateHelpers.generateTransfereeAddrStateKey(this.xrplAcc.address);
        const stateTransfereeAddrIndex = StateHelpers.getHookStateIndex(this.governorAddress, stateTransfereeAddrKey);
        const res = await this.xrplApi.getLedgerEntry(stateTransfereeAddrIndex);

        if (res && res?.HookStateData)
            return true;

        return false;
    }
}

module.exports = {
    HostEvents,
    HostClient
}

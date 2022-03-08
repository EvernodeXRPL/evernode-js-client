const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, EvernodeConstants, MemoFormats, MemoTypes, ErrorCodes } = require('../evernode-common');
const { XrplAccount } = require('../xrpl-account');
const { EncryptionHelper } = require('../encryption-helper');
const { Buffer } = require('buffer');
const codec = require('ripple-address-codec');

const HostEvents = {
    Redeem: EvernodeEvents.Redeem,
    NftOfferCreate: EvernodeEvents.NftOfferCreate
}

class HostClient extends BaseEvernodeClient {

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(HostEvents), true, options);
    }

    async getRegistrationNft() {
        // Find an owned NFT with matching Evernode host NFT prefix.
        const nft = (await this.xrplAcc.getNfts()).find(n => n.URI.startsWith(EvernodeConstants.NFT_PREFIX_HEX));
        if (nft) {
            // Check whether the token was actually issued from Evernode registry contract.
            const issuerHex = nft.TokenID.substr(8, 40);
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
            const host = await this.getHosts({ nfTokenId: nft.TokenID });
            if (host && host.length == 1)
                return host[0];
        }

        return null;
    }

    async isRegistered() {
        // TODO: This is a temporary fix until getRegistration get fixed.
        return (await this.getRegistrationNft()) !== null;
    }

    async prepareAccount() {
        const [flags, trustLines, msgKey] = await Promise.all([
            this.xrplAcc.getFlags(),
            this.xrplAcc.getTrustLines(EvernodeConstants.EVR, this.config.evrIssuerAddress),
            this.xrplAcc.getMessageKey()]);

        let accountSetFields = {};
        accountSetFields = (!flags.lsfDefaultRipple) ? { ...accountSetFields, Flags: { asfDefaultRipple: true } } : accountSetFields;
        accountSetFields = (!msgKey) ? { ...accountSetFields, MessageKey: this.accKeyPair.publicKey } : accountSetFields;

        if (Object.keys(accountSetFields).length !== 0)
            await this.xrplAcc.setAccountFields(accountSetFields);

        if (trustLines.length === 0)
            await this.xrplAcc.setTrustLine(EvernodeConstants.EVR, this.config.evrIssuerAddress, "99999999999999");
    }

    async register(hostingToken, countryCode, cpuMicroSec, ramMb, diskMb, totalInstanceCount, description, options = {}) {
        if (!/^([A-Z]{3})$/.test(hostingToken))
            throw "hostingToken should consist of 3 uppercase alphabetical characters";
        else if (!/^([A-Z]{2})$/.test(countryCode))
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

        const memoData = `${hostingToken};${countryCode};${cpuMicroSec};${ramMb};${diskMb};${totalInstanceCount};${description}`
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

        while (attemps < 60) {
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
                const sellOffer = (await registryAcc.getNftOffers()).find(o => o.TokenID === nft.TokenID && o.Flags === 1);
                await this.xrplAcc.buyNft(sellOffer.index);
                tx.isSellOfferAccepted = true;
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
            [{ type: MemoTypes.HOST_DEREG, format: MemoFormats.HEX, data: regNFT.TokenID }],
            options.transactionOptions);

        console.log('Waiting for the buy offer')
        const regAcc = new XrplAccount(this.registryAddress);
        let offer = null;
        let attempts = 0;
        while (attempts < 10) {
            offer = (await regAcc.getNftOffers()).find(o => (o.TokenID == regNFT.TokenID) && (o.Flags === 0));
            if (offer)
                break;
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
            console.log('No offer found. Retring...');
        }
        if (!offer)
            throw 'No offer found within timeout.';

        await this.xrplAcc.sellNft(offer.index);

        return await this.isRegistered();
    }

    async redeemSuccess(txHash, userAddress, instanceInfo, options = {}) {

        // Encrypt the instance info with the user's encryption key (Specified in MessageKey field of the user account).
        const userAcc = new XrplAccount(userAddress, null, { xrplApi: this.xrplApi });
        const encKey = await userAcc.getMessageKey();
        if (!encKey)
            throw "User encryption key not set.";

        const encrypted = await EncryptionHelper.encrypt(encKey, instanceInfo);
        const memos = [
            { type: MemoTypes.REDEEM_SUCCESS, format: MemoFormats.BASE64, data: encrypted },
            { type: MemoTypes.REDEEM_REF, format: MemoFormats.HEX, data: txHash }];

        return this.xrplAcc.makePayment(this.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            memos,
            options.transactionOptions);
    }

    async redeemError(txHash, reason, options = {}) {

        const memos = [
            { type: MemoTypes.REDEEM_ERROR, format: MemoFormats.JSON, data: { type: ErrorCodes.REDEEM_ERR, reason: reason } },
            { type: MemoTypes.REDEEM_REF, format: MemoFormats.HEX, data: txHash }];

        return this.xrplAcc.makePayment(this.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            memos,
            options.transactionOptions);
    }

    async heartbeat(options = {}) {
        return this.xrplAcc.makePayment(this.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            this.xrplAcc.address,
            [{ type: MemoTypes.HEARTBEAT, format: "", data: "" }],
            options.transactionOptions);
    }
}

module.exports = {
    HostEvents,
    HostClient
}
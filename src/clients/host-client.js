const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, EvernodeConstants, MemoFormats, MemoTypes, ErrorCodes, HookStateKeys } = require('../evernode-common');
const { XrplAccount } = require('../xrpl-account');
const { EncryptionHelper } = require('../encryption-helper');
const { UtilHelpers } = require('../util-helpers');
const { Buffer } = require('buffer');
const codec = require('ripple-address-codec');

const HostEvents = {
    Redeem: EvernodeEvents.Redeem
}

class HostClient extends BaseEvernodeClient {

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(HostEvents), true, options);
    }

    async getRegistrationNft() {
        // Find an owned NFT with matching Evernode host NFT prefix.
        const nft = (await this.xrplAcc.getNfts()).find(n => n.URI.startsWith(EvernodeConstants.NFT_PREFIX_HEX))
        if (nft) {
            // Check whether the token was actually issued from Evernode.
            const issuerHex = nft.TokenID.substr(8, 40);
            const issuerAddr = codec.encodeAccountID(Buffer.from(issuerHex, 'hex'));
            if (issuerAddr == this.config.evrIssuerAddress) {
                return nft;
            }
        }

        return null;
    }

    async getRegistration() {
        // Check whether we own an evernode host token.
        const nft = await this.getRegistrationNft();
        if (nft) {
            const state = (await this.getStates()).filter(s => s.key = (HookStateKeys.PREFIX_HOST_TOKENID + nft.TokenID));
            if (state) {
                const curMomentStartIdx = await this.getMomentStartIndex();
                return UtilHelpers.decodeRegistration(state.data, this.config.hostHeartbeatFreq, this.config.momentSize, curMomentStartIdx);
            }
        }

        return null;
    }

    async isRegistered() {
        return (await this.getRegistration()) !== undefined
    }

    async prepareAccount() {
        const [flags, trustLines, msgKey] = await Promise.all([
            this.xrplAcc.getFlags(),
            this.xrplAcc.getTrustLines(EvernodeConstants.EVR, this.config.evrIssuerAddress),
            this.xrplAcc.getMessageKey()]);

        if (!flags.lsfDefaultRipple)
            await this.xrplAcc.setDefaultRippling(true);

        if (trustLines.length === 0)
            await this.xrplAcc.setTrustLine(EvernodeConstants.EVR, this.config.evrIssuerAddress, "99999999999999");

        if (!msgKey)
            await this.xrplAcc.setMessageKey(this.accKeyPair.publicKey);
    }

    async register(hostingToken, countryCode, cpuMicroSec, ramMb, diskMb, description, options = {}) {
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
        // Need to use control characters inside this regex to match ascii characters.
        // Here we allow all the characters in ascii range except ";" for the description.
        // no-control-regex is enabled default by eslint:recommended, So we disable it only for next line.
        // eslint-disable-next-line no-control-regex
        else if (!/^((?![;])[\x00-\x7F]){0,26}$/.test(description))
            throw "description should consist of 0-26 ascii characters except ';'";

        if (await this.isRegistered())
            throw "Host already registered.";

        const memoData = `${hostingToken};${countryCode};${cpuMicroSec};${ramMb};${diskMb};${description}`
        return this.xrplAcc.makePayment(this.registryAddress,
            this.config.hostRegFee,
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [{ type: MemoTypes.HOST_REG, format: MemoFormats.TEXT, data: memoData }],
            options.transactionOptions);
    }

    async deregister(options = {}) {

        if (!(await this.isRegistered()))
            throw "Host not registered."

        return this.xrplAcc.makePayment(this.registryAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [{ type: MemoTypes.HOST_DEREG, format: MemoFormats.TEXT, data: "" }],
            options.transactionOptions);
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
const { RippleConstants } = require('../ripple-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, EvernodeConstants, MemoFormats, MemoTypes } = require('../evernode-common');
const { EncryptionHelper } = require('../encryption-helper');

export const HostEvents = {
    Redeem: EvernodeEvents.Redeem,
    Reward: EvernodeEvents.Reward
}

export class HostClient extends BaseEvernodeClient {

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.keys(HostEvents), options);
    }

    registerHost(hostingToken, instanceSize, location, options = {}) {
        const memoData = `${hostingToken};${instanceSize};${location}`
        return this.xrplAcc.makePayment(this.hookAddress,
            this.hookConf.hostRegFee,
            EvernodeConstants.EVR,
            this.hookAddress,
            [{ type: MemoTypes.HOST_REG, format: MemoFormats.TEXT, data: memoData }],
            options.transactionOptions);
    }

    deregisterHost(options = {}) {
        return this.xrplAcc.makePayment(this.hookAddress,
            RippleConstants.MIN_XRP_AMOUNT,
            RippleConstants.XRP,
            null,
            [{ type: MemoTypes.HOST_DEREG, format: MemoFormats.TEXT, data: "" }],
            options.transactionOptions);
    }

    async redeemSuccess(txHash, userAddress, userPubKey, instanceInfo, options = {}) {
        // Verifying the pubkey.
        if (!(await this.rippleAPI.isValidKeyForAddress(userPubKey, userAddress)))
            throw 'Invalid public key for redeem response encryption.';

        const memos = [{ type: MemoTypes.REDEEM_REF, format: MemoFormats.BINARY, data: txHash }];
        // Encrypt response with user pubkey.
        const encrypted = await EncryptionHelper.encrypt(userPubKey, instanceInfo);
        memos.push({ type: MemoTypes.REDEEM_RESP, format: MemoFormats.BINARY, data: encrypted });

        return this.xrplAcc.makePayment(this.hookAddress,
            RippleConstants.MIN_XRP_AMOUNT,
            RippleConstants.XRP,
            null,
            memos,
            options.transactionOptions);
    }

    async redeemError(txHash, reason, options = {}) {

        const memos = [
            { type: MemoTypes.REDEEM_REF, format: MemoFormats.BINARY, data: txHash },
            { type: MemoTypes.REDEEM_RESP, format: MemoFormats.JSON, data: { type: ErrorCodes.REDEEM_ERR, reason: reason } }
        ];

        return this.xrplAcc.makePayment(this.hookAddress,
            RippleConstants.MIN_XRP_AMOUNT,
            RippleConstants.XRP,
            null,
            memos,
            options.transactionOptions);
    }
}
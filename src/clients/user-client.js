const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, MemoFormats, MemoTypes, ErrorCodes, ErrorReasons } = require('../evernode-common');
const { EventEmitter } = require('../event-emitter');
const { EncryptionHelper } = require('../encryption-helper');
const { XrplAccount } = require('../xrpl-account');

const REDEEM_WATCH_PREFIX = 'redeem_';
const REFUND_WATCH_PREFIX = 'refund_';

const UserEvents = {
    RedeemSuccess: EvernodeEvents.RedeemSuccess,
    RedeemError: EvernodeEvents.RedeemError,
    RefundSuccess: EvernodeEvents.RefundSuccess
}

class UserClient extends BaseEvernodeClient {

    #respWatcher = new EventEmitter();

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(UserEvents), true, options);

        this.on(UserEvents.RedeemSuccess, async (ev) => {
            this.#respWatcher.emit(REDEEM_WATCH_PREFIX + ev.redeemTxHash, { success: true, data: ev.payload, transaction: ev.transaction });
        });
        this.on(UserEvents.RedeemError, async (ev) => {
            this.#respWatcher.emit(REDEEM_WATCH_PREFIX + ev.redeemTxHash, { success: false, data: ev.reason, transaction: ev.transaction });
        });
        this.on(UserEvents.RefundSuccess, async (ev) => {
            this.#respWatcher.emit(REFUND_WATCH_PREFIX + ev.redeemTxHash, ev);
        });
    }

    async redeemSubmit(hostingToken, hostAddress, amount, requirement, options = {}) {

        // Encrypt the requirements with the host's encryption key (Specified in MessageKey field of the host account).
        const hostAcc = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
        const encKey = await hostAcc.getEncryptionKey();
        if (!encKey)
            throw "Host encryption key not set.";

        const ecrypted = await EncryptionHelper.encrypt(encKey, requirement, {
            iv: options.iv, // Must be null or 16 bytes.
            ephemPrivateKey: options.ephemPrivateKey // Must be null or 32 bytes.
        });

        // We are returning the promise directly without awaiting to let the caller decide what to do with it.
        return this.xrplAcc.makePayment(this.hookAddress,
            amount.toString(),
            hostingToken,
            hostAddress,
            [{ type: MemoTypes.REDEEM, format: MemoFormats.BASE64, data: ecrypted }],
            options.transactionOptions);
    }

    watchRedeemResponse(tx, options = { timeout: 60000 }) {
        return new Promise(async (resolve, reject) => {
            console.log(`Waiting for redeem response... (txHash: ${tx.id})`);

            const watchEvent = REDEEM_WATCH_PREFIX + tx.id;

            const failTimeout = setTimeout(() => {
                this.#respWatcher.off(watchEvent);
                reject({ error: ErrorCodes.REDEEM_ERR, reason: `redeem_timeout` });
            }, options.timeout);

            this.#respWatcher.once(watchEvent, async (ev) => {
                clearTimeout(failTimeout);
                if (ev.success) {
                    const instanceInfo = ev.data;
                    resolve({ instance: instanceInfo.content, transaction: ev.transaction });
                }
                else {
                    reject({ error: ErrorCodes.REDEEM_ERR, reason: ev.data, transaction: ev.transaction });
                }
            })
        });
    }

    redeem(hostingToken, hostAddress, amount, requirement, options = {}) {
        return new Promise(async (resolve, reject) => {
            const tx = await this.redeemSubmit(hostingToken, hostAddress, amount, requirement, options).catch(errtx => {
                reject({ error: ErrorCodes.REDEEM_ERR, reason: ErrorReasons.TRANSACTION_FAILURE, transaction: errtx });
            });
            if (tx) {
                const response = await this.watchRedeemResponse(tx).catch(error => reject(error));
                if (response) {
                    response.redeemTransaction = tx;
                    resolve(response);
                }
            }
        });
    }

    watchRefundResponse(tx, options = { timeout: 60000 }) {
        return new Promise(async (resolve, reject) => {
            console.log(`Waiting for refund response... (txHash: ${tx.id})`);

            const watchEvent = REFUND_WATCH_PREFIX + tx.id;

            const failTimeout = setTimeout(() => {
                this.#respWatcher.off(watchEvent);
                reject({ error: ErrorCodes.REFUND_ERR, reason: `refund_timeout` });
            }, options.timeout);

            this.#respWatcher.once(watchEvent, (ev) => {
                clearTimeout(failTimeout);
                resolve(ev);
            });
        });
    }

    refund(redeemTxHash, options = {}) {
        return new Promise(async (resolve, reject) => {
            const tx = await this.xrplAcc.makePayment(this.hookAddress,
                XrplConstants.MIN_XRP_AMOUNT,
                XrplConstants.XRP,
                null,
                [{ type: MemoTypes.REFUND, format: MemoFormats.HEX, data: redeemTxHash }],
                options.transactionOptions)
                .catch(errtx => {
                    reject({ error: ErrorCodes.REFUND_ERR, reason: ErrorReasons.TRANSACTION_FAILURE, transaction: errtx });
                });
            if (tx) {
                const response = await this.watchRefundResponse(tx).catch(error => reject(error));
                if (response) {
                    response.refundTransaction = tx;
                    resolve(response);
                }
            }
        });
    }
}

module.exports = {
    UserEvents,
    UserClient
}
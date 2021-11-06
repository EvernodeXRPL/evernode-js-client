const { RippleConstants } = require('./ripple-common');
const { RippleAPIWrapper } = require('./ripple-api-wrapper');
const { XrplAccount } = require('./xrpl-account');
const { EncryptionHelper } = require('./encryption-helper');
const { EventEmitter } = require('./event-emitter');
const { EvernodeConstants, MemoFormats, MemoTypes, ErrorCodes, HookEvents } = require('./evernode-common');
const { EvernodeHook } = require('./evernode-hook');

const AUDIT_TRUSTLINE_LIMIT = 999999999;
const REDEEM_WATCH_PREFIX = 'redeem_';
const TRANSACTION_FAILURE = 'TRANSACTION_FAILURE';

export class EvernodeClient {

    #events = new EventEmitter();

    constructor(xrpAddress, xrpSecret, options = {}) {

        this.connected = false;
        this.hookAddress = options.hookAddress || EvernodeConstants.DEFAULT_HOOK_ADDR;
        this.rippleAPI = options.rippleAPI || new RippleAPIWrapper(options.rippledServer);

        this.xrpAddress = xrpAddress;
        this.xrpSecret = xrpSecret;
        this.xrplAcc = new XrplAccount(this.rippleAPI, this.xrpAddress, this.xrpSecret);
        this.accKeyPair = this.xrplAcc.deriveKeypair();
        this.evernodeHook = new EvernodeHook(this.rippleAPI, this.hookAddress);

        this.evernodeHook.events.on(HookEvents.RedeemSuccess, async (ev) => {
            this.#events.emit(REDEEM_WATCH_PREFIX + ev.redeemTxHash, { success: true, data: ev.payload, transaction: ev.transaction });
        })
        this.evernodeHook.events.on(HookEvents.RedeemError, async (ev) => {
            this.#events.emit(REDEEM_WATCH_PREFIX + ev.redeemTxHash, { success: false, data: ev.reason, transaction: ev.transaction });
        })
    }

    async connect() {
        if (this.connected)
            return;

        try { await this.rippleAPI.connect(); }
        catch (e) { throw e; }

        this.evernodeHookConf = await this.evernodeHook.getConfig();
        this.connected = true;
    }

    async redeemSubmit(hostingToken, hostAddress, amount, requirement, options = {}) {

        // Encrypt the requirements with the host's encryption key (Specified in MessageKey field of the host account).
        const hostAcc = new XrplAccount(this.rippleAPI, hostAddress);
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
            [{ type: MemoTypes.REDEEM, format: MemoFormats.BINARY, data: ecrypted }],
            options.transactionOptions);
    }

    watchRedeemResponse(tx, options = { timeout: 60000 }) {
        return new Promise(async (resolve, reject) => {
            console.log(`Waiting for redeem response... (txHash: ${tx.id})`);

            const watchEvent = REDEEM_WATCH_PREFIX + tx.id;

            const failTimeout = setInterval(() => {
                clearInterval(failTimeout);
                this.#events.off(watchEvent);
                reject({ error: ErrorCodes.REDEEM_ERR, reason: `redeem_timeout` });
            }, options.timeout);

            this.#events.once(watchEvent, async (ev) => {
                clearInterval(failTimeout);
                if (ev.success) {
                    const info = await EncryptionHelper.decrypt(this.accKeyPair.privateKey, ev.data);
                    resolve({ instance: info.content, transaction: ev.transaction });
                }
                else {
                    reject({ error: ErrorCodes.REDEEM_ERR, reason: ev.data, transaction: ev.transaction });
                }
            })

            this.evernodeHook.subscribe();
        });
    }

    redeem(hostingToken, hostAddress, amount, requirement, options = {}) {
        return new Promise(async (resolve, reject) => {
            const tx = await this.redeemSubmit(hostingToken, hostAddress, amount, requirement, options).catch(errtx => {
                reject({ error: ErrorCodes.REDEEM_ERR, reason: TRANSACTION_FAILURE, transaction: errtx });
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

    refund(redeemTxHash, options = {}) {
        return new Promise(async (resolve, reject) => {
            const res = await this.xrplAcc.makePayment(this.hookAddress,
                RippleConstants.MIN_XRP_AMOUNT,
                RippleConstants.XRP,
                null,
                [{ type: MemoTypes.REFUND, format: MemoFormats.BINARY, data: redeemTxHash }],
                options.transactionOptions)
                .catch(errtx => {
                    reject({ error: ErrorCodes.REFUND_ERR, reason: TRANSACTION_FAILURE, transaction: errtx });
                });
            if (res)
                resolve(res);
        });
    }

    registerHost(hostingToken, instanceSize, location, options = {}) {
        const memoData = `${hostingToken};${instanceSize};${location}`
        return this.xrplAcc.makePayment(this.hookAddress,
            this.evernodeHookConf.hostRegFee,
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

    async getRedeemRequirements(redeemPayload) {
        const instanceRequirements = await EncryptionHelper.decrypt(this.accKeyPair.privateKey, redeemPayload);
        if (!instanceRequirements) {
            console.log('Failed to decrypt redeem data.');
            return null;
        }
        return instanceRequirements;
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

    requestAudit(options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    RippleConstants.MIN_XRP_AMOUNT,
                    RippleConstants.XRP,
                    null,
                    [{ type: MemoTypes.AUDIT_REQ, format: MemoFormats.BINARY, data: '' }],
                    options.transactionOptions);
                if (res) {
                    const startingLedger = this.rippleAPI.ledgerVersion;
                    console.log('Waiting for check...');
                    const getChecksAndProcess = () => {
                        return new Promise(async (resolve, reject) => {
                            try {
                                const resp = await this.xrplAcc.getChecks(this.hookAddress);
                                if (resp && resp.account_objects.length > 0) {
                                    const check = resp.account_objects[0];
                                    const lines = await this.xrplAcc.getTrustLines(check.SendMax.currency, check.SendMax.issuer);
                                    if (lines && lines.length === 0) {
                                        console.log(`No trust lines found for ${check.SendMax.currency}/${check.SendMax.issuer}. Creating one...`);
                                        const ret = await this.xrplAcc.setTrustLine(check.SendMax.currency, check.SendMax.issuer, AUDIT_TRUSTLINE_LIMIT, false);
                                        if (!ret)
                                            reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: `Creating trustline for ${check.SendMax.currency}/${check.SendMax.issuer} failed.` });
                                    }

                                    // Cash the check.
                                    const result = await this.xrplAcc.cashCheck(check).catch(errtx =>
                                        reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: TRANSACTION_FAILURE, transaction: errtx }));
                                    if (result)
                                        resolve({
                                            address: check.SendMax.issuer,
                                            currency: check.SendMax.currency,
                                            amount: check.SendMax.value,
                                            cashTxHash: result.id
                                        });

                                } else if (resp && resp.account_objects.length === 0) {
                                    const timeout = setTimeout(() => {
                                        if (this.rippleAPI.ledgerVersion - startingLedger >= this.evernodeHookConf.momentSize) {
                                            clearTimeout(timeout);
                                            reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: `No checks found within moment(${this.evernodeHookConf.momentSize}) window.` });
                                        }
                                        getChecksAndProcess().then(result => resolve(result)).catch(error => reject(error));
                                    }, 1000);
                                }
                            } catch (error) {
                                reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: error });
                            }
                        });
                    }
                    resolve(await getChecksAndProcess());
                } else {
                    reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: TRANSACTION_FAILURE });
                }
            } catch (error) {
                // Throw the same error object receiving from the above try block. It is already formatted with AUDIT_REQ_FAILED code.
                reject(error);
            }
        });
    }

    auditSuccess(options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    RippleConstants.MIN_XRP_AMOUNT,
                    RippleConstants.XRP,
                    null,
                    [{ type: MemoTypes.AUDIT_SUCCESS, format: MemoFormats.BINARY, data: '' }],
                    options.transactionOptions);
                if (res)
                    resolve(res);
                else
                    reject({ error: ErrorCodes.AUDIT_SUCCESS_ERROR, reason: 'Audit success transaction failed.' });
            } catch (error) {
                console.error(error);
                reject({ error: ErrorCodes.AUDIT_SUCCESS_ERROR, reason: 'Audit success transaction failed.' });
            }
        });
    }

    async disconnect() {
        try { await this.rippleAPI.disconnect(); }
        catch (e) { throw e; }
    }
}
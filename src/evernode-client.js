const { XrplAccount, RippleAPIWrapper, RippleConstants } = require('./ripple-handler');
const { EncryptionHelper } = require('./encryption-helper');
const { EventEmitter } = require('./event-emitter');
const { Global, MemoFormats, MemoTypes, ErrorCodes, HookEvents } = require('./evernode-common');
const { EvernodeHook } = require('./evernode-hook');

const AUDIT_TRUSTLINE_LIMIT = 999999999;
const REDEEM_WATCH_PREFIX = "redeem_";

export class EvernodeClient {
    constructor(xrpAddress, xrpSecret, options = null) {

        if (!options)
            options = {};

        this.hookAddress = options.hookAddress || Global.DEFAULT_HOOK_ADDR;
        this.rippleAPI = options.rippleAPI || new RippleAPIWrapper(options.rippledServer);

        this.xrpAddress = xrpAddress;
        this.xrpSecret = xrpSecret;
        this.xrplAcc = new XrplAccount(this.rippleAPI, this.xrpAddress, this.xrpSecret);
        this.accKeyPair = this.xrplAcc.deriveKeypair();
        this.evernodeHook = new EvernodeHook(this.rippleAPI, this.hookAddress);

        this._events = new EventEmitter();
        this.evernodeHook.events.on(HookEvents.RedeemSuccess, async (ev) => {
            this._events.emit(REDEEM_WATCH_PREFIX + ev.redeemTxHash, { success: true, data: ev.payload });
        })
        this.evernodeHook.events.on(HookEvents.RedeemError, async (ev) => {
            this._events.emit(REDEEM_WATCH_PREFIX + ev.redeemTxHash, { success: false, data: ev.reason });
        })
    }

    async connect() {
        try { await this.rippleAPI.connect(); }
        catch (e) { throw e; }

        this.evernodeHookConf = await this.evernodeHook.getConfig();
    }

    async redeemSubmit(hostingToken, hostAddress, amount, requirement) {

        // Encrypt the requirements with the host's encryption key (Specified in MessageKey field of the host account).
        const hostAcc = new XrplAccount(this.rippleAPI, hostAddress);
        const encKey = await hostAcc.getEncryptionKey();
        if (!encKey)
            throw "Host encryption key not set.";

        const ecrypted = await EncryptionHelper.encrypt(encKey, requirement);

        // We are returning the promise directly without awaiting to let the caller decide what to do with it.
        return this.xrplAcc.makePayment(this.hookAddress,
            amount,
            hostingToken,
            hostAddress,
            [{ type: MemoTypes.REDEEM, format: MemoFormats.BINARY, data: ecrypted }]);
    }

    watchRedeemResponse(redeemTx) {
        return new Promise(async (resolve, reject) => {
            console.log(`Waiting for redeem response... (txHash: ${redeemTx.txHash})`);

            const watchEvent = REDEEM_WATCH_PREFIX + redeemTx.txHash;

            const failTimeout = setInterval(() => {
                if (this.rippleAPI.ledgerVersion - redeemTx.ledgerVersion >= this.evernodeHookConf.redeemWindow) {
                    clearInterval(failTimeout);
                    this._events.off(watchEvent);
                    reject({ error: ErrorCodes.REDEEM_ERR, reason: `REDEEM_TIMEOUT` });
                }
            }, 1000);

            this._events.once(watchEvent, async (ev) => {
                clearInterval(failTimeout);
                if (ev.success) {
                    const info = await EncryptionHelper.decrypt(this.accKeyPair.privateKey, ev.data);
                    resolve(info.content);
                }
                else {
                    reject({ error: ErrorCodes.REDEEM_ERR, reason: ev.data });
                }
            })

            this.evernodeHook.account.subscribe();
        });
    }

    redeem(hostingToken, hostAddress, amount, requirement) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.redeemSubmit(hostingToken, hostAddress, amount, requirement);
                if (res)
                    this.watchRedeemResponse(res).then(response => resolve(response), error => reject(error));
                else
                    reject({ error: ErrorCodes.REDEEM_ERR, reason: 'Redeem transaction failed.' });
            } catch (error) {
                reject({ error: ErrorCodes.REDEEM_ERR, reason: error });
            }
        });
    }

    refund(redeemTxHash) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    RippleConstants.MIN_XRP_AMOUNT,
                    'XRP',
                    null,
                    [{ type: MemoTypes.REFUND, format: MemoFormats.BINARY, data: redeemTxHash }]);
                if (res)
                    resolve(res);
                else
                    reject({ error: ErrorCodes.REFUND_ERR, reason: 'Refund transaction failed.' });
            } catch (error) {
                reject({ error: ErrorCodes.REFUND_ERR, reason: error });
            }
        });
    }

    requestAudit() {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    RippleConstants.MIN_XRP_AMOUNT,
                    'XRP',
                    null,
                    [{ type: MemoTypes.AUDIT_REQ, format: MemoFormats.BINARY, data: '' }]);
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
                                        const ret = await this.xrplAcc.createTrustLine(check.SendMax.currency, check.SendMax.issuer, AUDIT_TRUSTLINE_LIMIT, false);
                                        if (!ret)
                                            reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: `Creating trustline for ${check.SendMax.currency}/${check.SendMax.issuer} failed.` });
                                    }

                                    // Cash the check.
                                    const result = await this.xrplAcc.cashCheck(check);
                                    if (result)
                                        resolve({
                                            address: check.SendMax.issuer,
                                            currency: check.SendMax.currency,
                                            amount: check.SendMax.value,
                                            cashTxHash: result.txHash
                                        });
                                    else
                                        reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: 'Cashing check failed.' });
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
                    reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: 'Audit request failed.' });
                }
            } catch (error) {
                // Throw the same error object receiving from the above try block. It is already formatted with AUDIT_REQ_FAILED code.
                reject(error);
            }
        });
    }

    auditSuccess() {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    RippleConstants.MIN_XRP_AMOUNT,
                    'XRP',
                    null,
                    [{ type: MemoTypes.AUDIT_SUCCESS, format: MemoFormats.BINARY, data: '' }]);
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
const { XrplAccount, RippleAPIWrapper, RippleAPIEvents } = require('./ripple-handler');
const { EncryptionHelper } = require('./encryption-helper');


const MemoTypes = {
    REDEEM: 'evnRedeem',
    REDEEM_REF: 'evnRedeemRef',
    REDEEM_RESP: 'evnRedeemResp',
    HOST_REG: 'evnHostReg',
    HOST_DEREG: 'evnHostDereg',
    REFUND: 'evnRefund',
    AUDIT_REQ: 'evnAuditRequest',
    AUDIT_SUCCESS: 'evnAuditSuccess'
}

const MemoFormats = {
    TEXT: 'text/plain',
    JSON: 'text/json',
    BINARY: 'binary'
}

const ErrorCodes = {
    REDEEM_ERR: 'REDEEM_ERR',
    REFUND_ERR: 'REFUND_ERR',
    AUDIT_REQ_ERROR: 'AUDIT_REQ_ERROR',
    AUDIT_SUCCESS_ERROR: 'AUDIT_SUCCESS_ERROR',
}

const REDEEM_TIMEOUT_WINDOW = 24; // Max no. of ledgers within which a redeem operation has to be served.;
const MIN_XRP_AMOUNT = 0.000001;
const MOMENT_SIZE = 72;
const DEFAULT_HOOK_ADDR = 'rwGLw5uSGYm2couHZnrbCDKaQZQByvamj8';
const AUDIT_TRUSTLINE_LIMIT = 999999999;

class EvernodeClient {
    constructor(xrpAddress, xrpSecret, options = null) {

        this.xrpAddress = xrpAddress;
        this.xrpSecret = xrpSecret;

        if (!options)
            options = {};

        options.hookAddress = options.hookAddress || DEFAULT_HOOK_ADDR;
        this.options = options;

        this.rippleAPI = new RippleAPIWrapper(options.rippledServer);
    }

    async connect() {
        try { await this.rippleAPI.connect(); }
        catch (e) { throw e; }

        this.xrplAcc = new XrplAccount(this.rippleAPI, this.xrpAddress, this.xrpSecret);
        this.accKeyPair = this.xrplAcc.deriveKeypair();
        this.evernodeHookAcc = new XrplAccount(this.rippleAPI, this.options.hookAddress);
        this.ledgerSequence = this.rippleAPI.getLedgerVersion();
        this.rippleAPI.events.on(RippleAPIEvents.LEDGER, async (e) => {
            this.ledgerSequence = e.ledgerVersion;
        });
    }

    async redeem(hostingToken, hostAddress, amount, requirement) {
        return new Promise(async (resolve, reject) => {
            try {
                // For now we comment EVR reg fee transaction and make XRP transaction instead.
                const res = await this.xrplAcc.makePayment(this.options.hookAddress,
                    amount,
                    hostingToken,
                    hostAddress,
                    [{ type: MemoTypes.REDEEM, format: MemoFormats.BINARY, data: JSON.stringify(requirement) }]);
                if (res) {
                    console.log(`Redeem tx hash: ${res.txHash}`);
                    console.log(`Waiting for redeem response...`);
                    // Handle the transactions on evernode account and filter out redeem operations.
                    const failTimeout = setInterval(() => {
                        if (this.ledgerSequence - res.ledgerVersion >= REDEEM_TIMEOUT_WINDOW) {
                            clearInterval(failTimeout);
                            reject({ error: ErrorCodes.REDEEM_ERR, reason: `No response within ${REDEEM_TIMEOUT_WINDOW} ledgers time.`, redeemTxHash: res.txHash });
                        }
                    }, 1000);
                    this.evernodeHookAcc.events.on(RippleAPIEvents.PAYMENT, async (data, error) => {
                        if (error)
                            console.error(error);
                        else if (!data)
                            console.log('Invalid transaction.');
                        else {
                            if (data.Memos && data.Memos.length === 2 && data.Memos[0].format === MemoFormats.BINARY &&
                                data.Memos[0].type === MemoTypes.REDEEM_REF && data.Memos[0].data === res.txHash &&
                                data.Memos[1].type === MemoTypes.REDEEM_RESP && data.Memos[1].data) {
                                clearInterval(failTimeout);
                                const payload = data.Memos[1].data;
                                if (payload === ErrorCodes.REDEEM_ERR)
                                    reject({ error: ErrorCodes.REDEEM_ERR, reason: 'Redeem error occured in host.', redeemTxHash: res.txHash });
                                else {
                                    const info = await EncryptionHelper.decrypt(this.accKeyPair.privateKey, data.Memos[1].data);
                                    resolve(info.content);
                                }
                            }
                        }
                    });
                    this.evernodeHookAcc.subscribe();
                }
                else
                    reject({ error: ErrorCodes.REDEEM_ERR, reason: 'Redeem transaction failed.' });
            } catch (error) {
                reject({ error: ErrorCodes.REDEEM_ERR, reason: error });
            }
        });
    }

    async refund(redeemTxHash) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.options.hookAddress,
                    MIN_XRP_AMOUNT,
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

    async requestAudit() {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.options.hookAddress,
                    MIN_XRP_AMOUNT,
                    'XRP',
                    null,
                    [{ type: MemoTypes.AUDIT_REQ, format: MemoFormats.BINARY, data: '' }]);
                if (res) {
                    const startingLedger = this.ledgerSequence;
                    const checkForChecksFromHook = () => {
                        return new Promise(async (resolve, reject) => {
                            try {
                                const resp = await this.xrplAcc.checkForChecks(this.options.hookAddress);
                                if (resp && resp.account_objects.length > 0) {
                                    const check = resp.account_objects[0];
                                    const lines = await this.xrplAcc.getTrustLines(check.SendMax.currency, check.SendMax.issuer);
                                    if (lines && lines.length === 0) {
                                        console.log(`No trust lines found for ${check.SendMax.currency}/${check.SendMax.issuer}. Creating one...`);
                                        const ret = await this.xrplAcc.createTrustline(check.SendMax.currency, check.SendMax.issuer, AUDIT_TRUSTLINE_LIMIT, false);
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
                                        if (this.ledgerSequence - startingLedger >= MOMENT_SIZE) {
                                            clearTimeout(timeout);
                                            reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: `No checks found within moment(${MOMENT_SIZE}) window.` });
                                        }
                                        console.log('Waiting for check...');
                                        checkForChecksFromHook().then(result => resolve(result)).catch(error => reject(error));
                                    }, 1000);
                                }
                            } catch (error) {
                                reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: error });
                            }
                        });
                    }
                    resolve(await checkForChecksFromHook());
                } else {
                    reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: 'Audit request failed.' });
                }
            } catch (error) {
                // Throw the same error object receiving from the above try block. It is already formatted with AUDIT_REQ_FAILED code.
                reject(error);
            }
        });
    }

    async auditSuccess() {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.options.hookAddress,
                    MIN_XRP_AMOUNT,
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

module.exports = {
    EvernodeClient,
    MemoFormats,
    MemoTypes,
    ErrorCodes
}
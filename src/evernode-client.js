const { XrplAccount, RippleAPIWrapper, RippleAPIEvents, RippleConstants } = require('./ripple-handler');
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

const DEFAULT_HOOK_ADDR = 'rwGLw5uSGYm2couHZnrbCDKaQZQByvamj8';
const AUDIT_TRUSTLINE_LIMIT = 999999999;

// Default hook config values.
// If hook's state is empty values are loaded from here.
// Default values.
const DEF_MOMENT_SIZE = 72;
const DEF_HOST_REG_FEE = 5;
const DEF_REDEEM_WINDOW = 24;
const DEF_MOMENT_BASE_IDX = 0;

const HookStateKeys = {
    HOST_REG_FEE: ['E', 'V', 'R', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    MOMENT_SIZE: ['E', 'V', 'R', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    REDEEM_WINDOW: ['E', 'V', 'R', 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5],
    MOMENT_BASE_IDX: ['E', 'V', 'R', 52, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
}

class EvernodeClient {
    constructor(xrpAddress, xrpSecret, options = null) {

        this.xrpAddress = xrpAddress;
        this.xrpSecret = xrpSecret;

        if (!options)
            options = {};

        this.hookAddress = options.hookAddress || DEFAULT_HOOK_ADDR;
        this.rippleAPI = options.rippleAPI || new RippleAPIWrapper(options.rippledServer);
    }

    async connect() {
        try { await this.rippleAPI.connect(); }
        catch (e) { throw e; }

        this.xrplAcc = new XrplAccount(this.rippleAPI, this.xrpAddress, this.xrpSecret);
        this.accKeyPair = this.xrplAcc.deriveKeypair();
        this.evernodeHookAcc = new XrplAccount(this.rippleAPI, this.hookAddress);
        this.evernodeHook = new EvernodeHook(this.evernodeHookAcc);

        await this.fetchHookConfigValues();
    }

    async fetchHookConfigValues() {
        this.evernodeHook = new EvernodeHook(this.evernodeHookAcc);
        this.evernodeHookConf = await this.evernodeHook.getConfig();

        console.log('Hook state configurations are loaded.');
        console.log(JSON.stringify(this.evernodeHookConf).replace('\\', ''));
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
            // Handle the transactions on evernode account and filter out redeem operations.
            const failTimeout = setInterval(() => {
                if (this.rippleAPI.ledgerVersion - redeemTx.ledgerVersion >= this.evernodeHookConf.redeemWindow) {
                    clearInterval(failTimeout);
                    reject({ error: ErrorCodes.REDEEM_ERR, reason: `No response within ${this.evernodeHookConf.redeemWindow} ledgers time.`, redeemTxHash: redeemTx.txHash });
                }
            }, 1000);
            this.evernodeHookAcc.events.on(RippleAPIEvents.PAYMENT, async (data, error) => {
                if (error)
                    console.error(error);
                else if (!data)
                    console.log('Invalid transaction.');
                else {
                    if (data.Memos && data.Memos.length === 2 && data.Memos[0].format === MemoFormats.BINARY &&
                        data.Memos[0].type === MemoTypes.REDEEM_REF && data.Memos[0].data === redeemTx.txHash &&
                        data.Memos[1].type === MemoTypes.REDEEM_RESP && data.Memos[1].data) {
                        clearInterval(failTimeout);
                        const payload = data.Memos[1].data;
                        if (payload === ErrorCodes.REDEEM_ERR)
                            reject({ error: ErrorCodes.REDEEM_ERR, reason: 'Redeem error occured in host.', redeemTxHash: redeemTx.txHash });
                        else {
                            const info = await EncryptionHelper.decrypt(this.accKeyPair.privateKey, data.Memos[1].data);
                            resolve(info.content);
                        }
                    }
                }
            });
            this.evernodeHookAcc.subscribe();
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

class EvernodeHook {
    constructor(account) {
        this.account = account;
    }

    async getHookStates() {
        let states = await this.account.getStates();
        states = states.filter(s => s.LedgerEntryType === 'HookState');
        states = states.map(s => {
            return {
                key: Buffer.from(s.HookStateKey, 'hex'),
                data: Buffer.from(s.HookStateData, 'hex')
            }
        });
        return states;
    }

    readUInt(buf, base = 32, isBE = true) {
        switch (base) {
            case (16):
                return isBE ? buf.readUInt16BE() : buf.readUInt16LE();
            case (64):
                return isBE ? Number(buf.readBigUInt64BE(0)) : Number(buf.readBigUInt64LE(0));
            default:
                return isBE ? buf.readUInt32BE() : buf.readUInt32LE();
        }
    }

    getStateData(states, key) {
        // If there's any ascii chars, take their ascii value.
        for (const i in key)
            if (typeof key[i] === 'string')
                key[i] = key[i].charCodeAt(0);
        const state = states.find(s => Buffer.from(key).equals(s.key));
        return state?.data;
    }

    async getConfig() {
        const states = await this.getHookStates();
        let config = {};
        let buf = this.getStateData(states, HookStateKeys.HOST_REG_FEE);
        config.hostRegFee = buf ? this.readUInt(Buffer.from(buf), 16) : DEF_HOST_REG_FEE;

        buf = this.getStateData(states, HookStateKeys.MOMENT_SIZE);
        config.momentSize = buf ? this.readUInt(Buffer.from(buf), 16) : DEF_MOMENT_SIZE;

        buf = this.getStateData(states, HookStateKeys.REDEEM_WINDOW);
        config.redeemWindow = buf ? this.readUInt(Buffer.from(buf), 16) : DEF_REDEEM_WINDOW;

        buf = this.getStateData(states, HookStateKeys.MOMENT_BASE_IDX);
        config.momentBaseIdx = buf ? this.readUInt(Buffer.from(buf), 64) : DEF_MOMENT_BASE_IDX;

        return config;
    }
}

module.exports = {
    EvernodeClient,
    EvernodeHook,
    MemoFormats,
    MemoTypes,
    ErrorCodes
}
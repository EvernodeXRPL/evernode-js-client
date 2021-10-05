const { XrplAccount, RippleAPIWrapper, RippleAPIEvents } = require('./ripple-handler');
const { EncryptionHelper } = require('./encryption-helper');

const REDEEM_TIMEOUT_WINDOW = 24; // Max no. of ledgers within which a redeem operation has to be served.;

const MemoTypes = {
    REDEEM: 'evnRedeem',
    REDEEM_REF: 'evnRedeemRef',
    REDEEM_RESP: 'evnRedeemResp',
    HOST_REG: 'evnHostReg',
    HOST_DEREG: 'evnHostDereg',
}

const MemoFormats = {
    TEXT: 'text/plain',
    JSON: 'text/json',
    BINARY: 'binary'
}

const ErrorCodes = {
    REDEEM_ERR: 'REDEEM_ERR'
}

const DEFAULT_HOOK_ADDR = 'rwGLw5uSGYm2couHZnrbCDKaQZQByvamj8';

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
        this.ledgerSequence = this.rippleAPI.getLedgerVersion();
        this.rippleAPI.events.on(RippleAPIEvents.LEDGER, async (e) => {
            this.ledgerSequence = e.ledgerVersion;
        });
    }

    async redeem(hostingToken, hostAddress, amount, requirement) {
        return new Promise(async (resolve, reject) => {
            try {
                // For now we comment EVR reg fee transaction and make XRP transaction instead.
                const res = await this.xrplAcc.makePayment(this.hookAddress,
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
                            reject({ reason: `No response within ${REDEEM_TIMEOUT_WINDOW} ledgers time.`, redeemTxHash: res.txHash });
                        }
                    }, 1000);
                    this.evernodeHookAcc.events.on(RippleAPIEvents.PAYMENT, async (data, error) => {
                        if (error)
                            console.error(error);
                        else if (!data)
                            console.log('Invalid transaction.');
                        else if (data) {
                            if (data.Memos && data.Memos.length === 2 && data.Memos[0].format === MemoFormats.BINARY &&
                                data.Memos[0].type === MemoTypes.REDEEM_REF && data.Memos[0].data === res.txHash &&
                                data.Memos[1].type === MemoTypes.REDEEM_RESP && data.Memos[1].data) {
                                clearInterval(failTimeout);
                                const payload = data.Memos[1].data;
                                if (payload === ErrorCodes.REDEEM_ERR)
                                    reject({ reason: "Redeem error.", redeemTxHash: res.txHash });
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
                    reject('Redeem transaction failed.');
            } catch (error) {
                reject(error);
            }
        });
    }

    async refund(redeemTxHash) {
        return new Promise(async (resolve, reject) => {
            try {
                setTimeout(async () => {
                    resolve(true);
                }, 5000);
            } catch (error) {
                reject(false);
            }
        });
    }

    async requestAudit() {
        return new Promise(async (resolve, reject) => {
            try {
                setTimeout(async () => {
                    resolve(true);
                }, 5000);
            } catch (error) {
                reject(false);
            }
        });
    }

    async auditSuccess() {
        return new Promise(async (resolve, reject) => {
            try {
                setTimeout(async () => {
                    resolve(true);
                }, 5000);
            } catch (error) {
                reject(false);
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
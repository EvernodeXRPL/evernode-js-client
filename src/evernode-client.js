const { XrplAccount, RippleAPIWrapper, Events, MemoFormats, MemoTypes, ErrorCodes, EncryptionHelper } = require('./ripple-handler');

const REDEEM_TIMEOUT_WINDOW = 24; // Max no. of ledgers within which a redeem operation has to be served.;

export class EvernodeClient {
    constructor(xrpAddress, xrpSecret) {
        this.xrpAddress = xrpAddress;
        this.xrpSecret = xrpSecret;
        this.hookAddress = 'rwGLw5uSGYm2couHZnrbCDKaQZQByvamj8';
        const rippleServer = 'wss://hooks-testnet.xrpl-labs.com';
        this.rippleAPI = new RippleAPIWrapper(rippleServer);
    }

    async connect() {
        try { await this.rippleAPI.connect(); }
        catch (e) { throw e; }

        this.xrplAcc = new XrplAccount(this.rippleAPI, this.xrpAddress, this.xrpSecret);
        this.accKeyPair = this.xrplAcc.deriveKeypair();
        this.evernodeHookAcc = new XrplAccount(this.rippleAPI, this.hookAddress);
        this.ledgerSequence = this.rippleAPI.getLedgerVersion();
        this.rippleAPI.events.on(Events.LEDGER, async (e) => {
            this.ledgerSequence = e.ledgerVersion;
        });
    }

    async redeem(hostingToken, hostAddress, amount, requirement) {
        return new Promise(async (resolve, reject) => {
            try {
                requirement.owner_pubkey = 'ed5cb83404120ac759609819591ef839b7d222c84f1f08b3012f490586159d2b50';
                // For now we comment EVR reg fee transaction and make XRP transaction instead.
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    amount,
                    hostingToken,
                    hostAddress,
                    [{ type: MemoTypes.REDEEM, format: MemoFormats.BINARY, data: JSON.stringify(requirement) }]);
                if (res) {
                    console.log(`Redeem tx hash: ${res.txHash}`);
                    // Handle the transactions on evernode account and filter out redeem operations.
                    const failTimeout = setInterval(() => {
                        console.log(`Waiting for redeem response...`);
                        if (this.ledgerSequence - res.ledgerVersion >= REDEEM_TIMEOUT_WINDOW) {
                            clearInterval(failTimeout);
                            reject({ reason: `No response within ${REDEEM_TIMEOUT_WINDOW} ledgers time.`, redeemTxHash: res.txHash });
                        }
                    }, 1000);
                    this.evernodeHookAcc.events.on(Events.PAYMENT, async (data, error) => {
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
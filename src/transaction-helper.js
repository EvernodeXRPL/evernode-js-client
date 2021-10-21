const { RippleConstants } = require('./ripple-common');

export class TransactionHelper {

    constructor(rippleAPI, secret) {
        this.rippleAPI = rippleAPI;
        this.secret = secret;
    }

    static deserializeMemo(memo) {
        return {
            type: memo.MemoType ? hexToASCII(memo.MemoType) : null,
            format: memo.MemoFormat ? hexToASCII(memo.MemoFormat) : null,
            data: memo.MemoData ? hexToASCII(memo.MemoData) : null
        };
    }

    getMaxLedgerVersion() {
        return this.rippleAPI.ledgerVersion + RippleConstants.MAX_LEDGER_OFFSET;
    }

    submitAndVerifyTransaction(preparedTx) {

        // Returned format.
        // {
        //     id: txHash, (if signing success)
        //     submission: submission details, (if signing success)
        //     ...other tx data... (on successful verification only)
        //     error: signing error or submission error or ledger error
        // }

        return new Promise(async (resolve, reject) => {

            if (!this.secret) {
                reject({
                    error: "NO_SECRET"
                });
                return;
            }

            let signed = null;

            try {
                signed = this.rippleAPI.api.sign(preparedTx.txJSON, this.secret);
            }
            catch (err) {
                reject({
                    error: err
                });
            }

            if (signed) {
                const submission = await this.rippleAPI.api.submit(signed.signedTransaction).catch(errsub => {
                    reject({
                        id: signed.id,
                        error: errsub.data
                    });
                });

                if (submission) {
                    if (submission.resultCode !== "tesSUCCESS") {
                        console.log("Txn submission failure: " + submission.resultCode)
                        reject({
                            id: signed.id,
                            submission: submission
                        });
                    }
                    else {
                        const tx = await this.verifyTransaction(signed.id, this.rippleAPI.ledgerVersion, this.getMaxLedgerVersion()).catch(errtx => {
                            errtx.submission = submission;
                            reject(errtx);
                        });
                        if (tx) {
                            tx.submission = submission;
                            resolve(tx);
                        }
                    }
                }
            }
        });
    }

    verifyTransaction(txHash, minLedger, maxLedger) {
        console.log("Waiting for verification...");
        return new Promise((resolve, reject) => {
            this.waitForTransactionVerification(txHash, minLedger, maxLedger, resolve, reject);
        })
    }

    waitForTransactionVerification(txHash, minLedger, maxLedger, resolve, reject) {
        this.rippleAPI.api.getTransaction(txHash, {
            minLedgerVersion: minLedger,
            maxLedgerVersion: maxLedger
        }).then(tx => {
            console.log(tx.outcome.result);
            if (tx.outcome.result !== 'tesSUCCESS') {
                console.log("Transaction verification failed. Result: " + tx.outcome.result);
                reject(tx);
            }
            else {
                resolve(tx);
            }
        }).catch(error => {
            // If transaction not in latest validated ledger, try again until max ledger is hit.
            if (error instanceof this.rippleAPI.api.errors.PendingLedgerVersionError || error instanceof this.rippleAPI.api.errors.NotFoundError) {
                setTimeout(() => {
                    this.waitForTransactionVerification(txHash, minLedger, maxLedger, resolve);
                }, 1000);
            }
            else {
                console.log(error);
                console.log("Transaction verification failed.");
                reject({
                    id: txHash,
                    error: error
                }); // give up.
            }
        })
    }
}

function hexToASCII(hex) {
    let str = "";
    for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
}
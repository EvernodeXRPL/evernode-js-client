const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, MemoFormats, MemoTypes, ErrorCodes } = require('../evernode-common');
const { EventEmitter } = require('../event-emitter');

const AUDIT_TRUSTLINE_LIMIT = '999999999';
const TRANSACTION_FAILURE = 'TRANSACTION_FAILURE';

export const AuditorEvents = {
    AuditAssignment: EvernodeEvents.AuditAssignment
}

export class AuditorClient extends BaseEvernodeClient {

    #respWatcher = new EventEmitter();

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.keys(AuditorEvents), true, options);

        this.on(AuditorEvents.AuditAssignment, async (ev) => {
            this.#respWatcher.emit(AuditorEvents.AuditAssignment, ev);
        });
    }

    requestAudit(options = {}) {
        return new Promise(async (resolve, reject) => {
            let timeout = null;
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    XrplConstants.MIN_XRP_AMOUNT,
                    XrplConstants.XRP,
                    null,
                    [{ type: MemoTypes.AUDIT_REQ, format: MemoFormats.BINARY, data: '' }],
                    options.transactionOptions);

                if (res) {
                    const startingLedger = this.xrplApi.ledgerIndex;
                    timeout = setInterval(() => {
                        if (this.xrplApi.ledgerIndex - startingLedger >= this.hookConfig.momentSize) {
                            this.#respWatcher.off(AuditorEvents.AuditAssignment);
                            clearInterval(timeout);
                            console.log('Audit request timeout');
                            reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: `No checks found within moment(${this.hookConfig.momentSize}) window.` });
                        }
                    }, 2000);
                    console.log('Waiting for check...');

                    this.#respWatcher.once(AuditorEvents.AuditAssignment, async (data) => {
                        const lines = await this.xrplAcc.getTrustLines(data.currency, data.issuer);
                        if (lines && lines.length === 0) {
                            console.log(`No trust lines found for ${data.currency}/${data.issuer}. Creating one...`);
                            const ret = await this.xrplAcc.setTrustLine(data.currency, data.issuer, AUDIT_TRUSTLINE_LIMIT, false);
                            if (!ret) {
                                clearInterval(timeout);
                                reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: `Creating trustline for ${data.currency}/${data.issuer} failed.` });
                            }
                        }
                        // Cash the check.
                        const result = await this.xrplAcc.cashCheck(data.transaction).catch(errtx => {
                            clearInterval(timeout);
                            reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: TRANSACTION_FAILURE, transaction: errtx });
                        });
                        if (result) {
                            clearInterval(timeout);
                            resolve({
                                address: data.issuer,
                                currency: data.currency,
                                amount: data.value,
                                cashTxHash: result.id
                            });
                        }
                    });


                } else {
                    clearInterval(timeout);
                    reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: TRANSACTION_FAILURE });
                }
            } catch (error) {
                if (timeout)
                    clearInterval(timeout);
                // Throw the same error object receiving from the above try block. It is already formatted with AUDIT_REQ_FAILED code.
                reject(error);
            }
        });
    }

    auditSuccess(options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    XrplConstants.MIN_XRP_AMOUNT,
                    XrplConstants.XRP,
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
}

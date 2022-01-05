const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, MemoTypes, ErrorCodes, ErrorReasons, MemoFormats } = require('../evernode-common');
const { EventEmitter } = require('../event-emitter');
const rippleCodec = require('ripple-address-codec');

const AUDIT_TRUSTLINE_LIMIT = '999999999';

const AuditorEvents = {
    AuditAssignment: EvernodeEvents.AuditAssignment
}

class AuditorClient extends BaseEvernodeClient {

    events = new EventEmitter();

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(AuditorEvents), true, options);
    }

    cashAuditAssignment(assignmentInfo) {
        return new Promise(async (resolve, reject) => {
            try {
                const lines = await this.xrplAcc.getTrustLines(assignmentInfo.currency, assignmentInfo.issuer);
                if (lines && lines.length === 0) {
                    console.log(`No trust lines found for ${assignmentInfo.currency}/${assignmentInfo.issuer}. Creating one...`);
                    const ret = await this.xrplAcc.setTrustLine(assignmentInfo.currency, assignmentInfo.issuer, AUDIT_TRUSTLINE_LIMIT, false);
                    if (!ret)
                        reject({ error: ErrorCodes.AUDIT_CASH_ERROR, reason: `Creating trustline for ${assignmentInfo.currency}/${assignmentInfo.issuer} failed.` });
                }
                // Cash the check.
                const res = await this.xrplAcc.cashCheck(assignmentInfo.transaction).catch(errtx => {
                    reject({ error: ErrorCodes.AUDIT_CASH_ERROR, reason: ErrorReasons.TRANSACTION_FAILURE, transaction: errtx });
                });

                if (res)
                    resolve({ ...res, trustCreated: (lines && lines.length === 0) });
                else
                    reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: ErrorReasons.TRANSACTION_FAILURE });

            } catch (error) {
                reject({ error: ErrorCodes.AUDIT_CASH_ERROR, reason: ErrorReasons.TRANSACTION_FAILURE });
            }
        });
    }

    removeAuditTrustline(hostAddress, hostCurrency) {
        return new Promise(async (resolve, reject) => {
            try {
                // Check trustline exist. If so, skip removing the trustline.
                const lines = await this.xrplAcc.getTrustLines(hostCurrency, hostAddress);
                if (lines && lines.length === 0) {
                    console.log(`No trust lines found for ${hostCurrency}/${hostAddress}.`);
                    resolve();
                }
                else {
                    // Transfer the hosting token balance back to the host.
                    const ret = await this.xrplAcc.makePayment(hostAddress,
                        lines[0].balance,
                        hostCurrency,
                        hostAddress);
                    if (!ret)
                        reject({ error: ErrorCodes.AUDIT_CLEAR_TRUST_ERROR, reason: `Transfering ${hostCurrency}/${hostAddress} back to ${hostAddress} failed.` });

                    const res = await this.xrplAcc.setTrustLine(hostCurrency, hostAddress, "0");
                    if (res)
                        resolve(res);
                    else
                        reject({ error: ErrorCodes.AUDIT_CLEAR_TRUST_ERROR, reason: `Removing trustline for ${hostCurrency}/${hostAddress} failed.` });
                }
            } catch (error) {
                reject({ error: ErrorCodes.AUDIT_CLEAR_TRUST_ERROR, reason: ErrorReasons.TRANSACTION_FAILURE });
            }
        });
    }

    requestAudit(options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    XrplConstants.MIN_XRP_AMOUNT,
                    XrplConstants.XRP,
                    null,
                    [{ type: MemoTypes.AUDIT, format: '', data: '' }],
                    options.transactionOptions);
                if (res)
                    resolve(res);
                else
                    reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: ErrorReasons.TRANSACTION_FAILURE });
            } catch (error) {
                reject({ error: ErrorCodes.AUDIT_REQ_ERROR, reason: ErrorReasons.TRANSACTION_FAILURE });
            }
        });
    }

    auditSuccess(hostAddress, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    XrplConstants.MIN_XRP_AMOUNT,
                    XrplConstants.XRP,
                    null,
                    [{ type: MemoTypes.AUDIT_SUCCESS, format: MemoFormats.HEX, data: rippleCodec.decodeAccountID(hostAddress).toString('hex') }],
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

    auditFail(hostAddress, options = {}) {
        return new Promise(async (resolve, reject) => {
            try {
                const res = await this.xrplAcc.makePayment(this.hookAddress,
                    XrplConstants.MIN_XRP_AMOUNT,
                    XrplConstants.XRP,
                    null,
                    [{ type: MemoTypes.AUDIT_FAILED, format: MemoFormats.HEX, data: rippleCodec.decodeAccountID(hostAddress).toString('hex') }],
                    options.transactionOptions);
                if (res)
                    resolve(res);
                else
                    reject({ error: ErrorCodes.AUDIT_FAIL_ERROR, reason: 'Audit failure transaction failed.' });
            } catch (error) {
                console.error(error);
                reject({ error: ErrorCodes.AUDIT_FAIL_ERROR, reason: 'Audit failure transaction failed.' });
            }
        });
    }
}

module.exports = {
    AuditorEvents,
    AuditorClient
}
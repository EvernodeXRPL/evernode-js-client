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

    #respWatcher = new EventEmitter();

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(AuditorEvents), true, options);

        this.on(AuditorEvents.AuditAssignment, async (ev) => {
            this.#respWatcher.emit(AuditorEvents.AuditAssignment, ev);
        });
    }

    onAuditAssignment(callback) {
        this.#respWatcher.on(AuditorEvents.AuditAssignment, async (data) => {
            const lines = await this.xrplAcc.getTrustLines(data.currency, data.issuer);
            if (lines && lines.length === 0) {
                console.log(`No trust lines found for ${data.currency}/${data.issuer}. Creating one...`);
                const ret = await this.xrplAcc.setTrustLine(data.currency, data.issuer, AUDIT_TRUSTLINE_LIMIT, false);
                if (!ret)
                    callback(null, { error: ErrorCodes.AUDIT_REQ_ERROR, reason: `Creating trustline for ${data.currency}/${data.issuer} failed.` });
            }
            // Cash the check.
            const result = await this.xrplAcc.cashCheck(data.transaction).catch(errtx => {
                callback(null, { error: ErrorCodes.AUDIT_REQ_ERROR, reason: ErrorReasons.TRANSACTION_FAILURE, transaction: errtx });
            });
            if (result) {
                callback({
                    address: data.issuer,
                    currency: data.currency,
                    amount: data.value,
                    auditAssignmentRef: result.id
                });
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
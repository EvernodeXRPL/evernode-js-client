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

        // Forward AuditAssignment to the auditor event subscribers.
        // So, they can start audit.
        this.on(AuditorEvents.AuditAssignment, async (ev) => {
            const lines = await this.xrplAcc.getTrustLines(ev.currency, ev.issuer);
            if (lines && lines.length === 0) {
                console.log(`No trust lines found for ${ev.currency}/${ev.issuer}. Creating one...`);
                const ret = await this.xrplAcc.setTrustLine(ev.currency, ev.issuer, AUDIT_TRUSTLINE_LIMIT, false);
                if (!ret)
                    this.events.emit(AuditorEvents.AuditAssignment, null, { error: ErrorCodes.AUDIT_REQ_ERROR, reason: `Creating trustline for ${ev.currency}/${ev.issuer} failed.` });
            }
            // Cash the check.
            const result = await this.xrplAcc.cashCheck(ev.transaction).catch(errtx => {
                this.events.emit(AuditorEvents.AuditAssignment, null, { error: ErrorCodes.AUDIT_REQ_ERROR, reason: ErrorReasons.TRANSACTION_FAILURE, transaction: errtx });
            });
            if (result) {
                this.events.emit(AuditorEvents.AuditAssignment, {
                    address: ev.issuer,
                    currency: ev.currency,
                    amount: ev.value,
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
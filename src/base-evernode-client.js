const { RippleAPIWrapper } = require('./ripple-api-wrapper');
const { XrplAccount } = require('./xrpl-account');
const { EvernodeEvents, HookStateKeys, HookStateDefaults } = require('./evernode-common');
const { DefaultValues } = require('./defaults');
const { EncryptionHelper } = require('./encryption-helper');
const { EventEmitter } = require('./event-emitter');

export class BaseEvernodeClient {

    #watchEvents;

    constructor(xrpAddress, xrpSecret, watchEvents, options = {}) {

        this.connected = false;
        this.hookAddress = options.hookAddress || DefaultValues.hookAddress;
        this.rippleAPI = options.rippleAPI || new RippleAPIWrapper(options.rippledServer);
        this.xrplAcc = new XrplAccount(this.rippleAPI, xrpAddress, xrpSecret);
        this.accKeyPair = this.secret && this.xrplAcc.deriveKeypair();
        this.#watchEvents = watchEvents;
        this.events = new EventEmitter();

        this.xrplAcc.on(RippleAPIEvents.PAYMENT, (tx, error) => this.#handleEvernodeEvent(tx, error));
        this.xrplAcc.on(RippleAPIEvents.CHECK_CREATE, (tx, error) => this.#handleEvernodeEvent(tx, error));
    }

    on(event, handler) {
        this.events.on(event, handler);
    }

    once(event, handler) {
        this.events.once(event, handler);
    }

    off(event, handler = null) {
        this.events.off(event, handler);
    }

    async connect() {
        if (this.connected)
            return;

        try { await this.rippleAPI.connect(); }
        catch (e) { throw e; }

        this.hookConf = await this.#getHookConfig();
        this.connected = true;

    }

    async disconnect() {
        try { await this.rippleAPI.disconnect(); }
        catch (e) { throw e; }
    }

    async subscribe() {
        await this.xrplAcc.subscribe();
    }

    async #getHookConfig() {
        let states = await this.xrplAcc.getHookStates();
        states = states.map(s => {
            return {
                key: s.key,
                data: Buffer.from(s.data, 'hex')
            }
        });

        let config = {};
        let buf = getStateData(states, HookStateKeys.HOST_REG_FEE);
        if (buf) {
            buf = Buffer.from(buf);
            const xfl = buf.readBigInt64BE(0);
            config.hostRegFee = XflHelpers.toString(xfl);
        }
        else {
            config.hostRegFee = HookStateDefaults.HOST_REG_FEE;
        }


        buf = getStateData(states, HookStateKeys.MOMENT_SIZE);
        config.momentSize = buf ? readUInt(buf, 16) : HookStateDefaults.MOMENT_SIZE;

        buf = getStateData(states, HookStateKeys.REDEEM_WINDOW);
        config.redeemWindow = buf ? readUInt(buf, 16) : HookStateDefaults.REDEEM_WINDOW;

        buf = getStateData(states, HookStateKeys.MIN_REDEEM);
        config.minRedeem = buf ? readUInt(buf, 16) : HookStateDefaults.MIN_REDEEM;

        buf = getStateData(states, HookStateKeys.MOMENT_BASE_IDX);
        config.momentBaseIdx = buf ? readUInt(buf, 64) : HookStateDefaults.MOMENT_BASE_IDX;

        return config;
    }

    async #handleEvernodeEvent(tx, error) {
        if (error)
            console.error(error);
        else if (!tx)
            console.log('handleEvernodeEvent: Invalid transaction.');
        else {
            const ev = await this.#extractEvernodeEvent(tx);
            if (ev && this.#watchEvents.find(ev.name))
                this.events.emit(ev.name, ev.data);
        }
    }

    async #extractEvernodeEvent(tx) {
        if (!tx.Memos || tx.Memos.length === 0)
            return null;

        if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
            tx.Memos[0].type === MemoTypes.REDEEM && tx.Memos[0].data) {

            // If our account is the destination host account, then decrypt the payload.
            let payload = tx.Memos[0].data;
            if (tx.Destination === this.xrplAcc.address) {
                const decrypted = this.accKeyPair && await EncryptionHelper.decrypt(this.accKeyPair.privateKey, payload);
                if (decrypted)
                    payload = decrypted;
                else
                    console.log('Failed to decrypt redeem data.');
            }

            return {
                name: EvernodeEvents.Redeem,
                data: {
                    transaction: tx,
                    user: tx.Account,
                    host: tx.Amount.issuer,
                    token: tx.Amount.currency,
                    moments: parseInt(tx.Amount.value),
                    payload: payload
                }
            }
        }
        else if (tx.Memos.length >= 2 && tx.Memos[0].format === MemoFormats.BINARY &&
            tx.Memos[0].type === MemoTypes.REDEEM_REF && tx.Memos[0].data &&
            tx.Memos[1].type === MemoTypes.REDEEM_RESP && tx.Memos[1].data) {

            const redeemTxHash = tx.Memos[0].data;
            let payload = tx.Memos[1].data;
            if (tx.Memos[1].format === MemoFormats.JSON) { // Format text/json means this is an error message. 
                const error = JSON.parse(payload);
                return {
                    name: EvernodeEvents.RedeemError,
                    data: {
                        transaction: tx,
                        redeemTxHash: redeemTxHash,
                        reason: error.reason
                    }
                }
            }
            else {

                // If our account is the destination user account, then decrypt the payload.
                if (tx.Destination === this.xrplAcc.address) {
                    const decrypted = this.accKeyPair && await EncryptionHelper.decrypt(this.accKeyPair.privateKey, payload);
                    if (decrypted)
                        payload = decrypted;
                    else
                        console.log('Failed to decrypt instance data.');
                }

                return {
                    name: EvernodeEvents.RedeemSuccess,
                    data: {
                        transaction: tx,
                        redeemTxHash: redeemTxHash,
                        payload: payload
                    }
                }
            }
        }
        else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
            tx.Memos[0].type === MemoTypes.REFUND && tx.Memos[0].data) {

            return {
                name: EvernodeEvents.RefundRequest,
                data: {
                    transaction: tx,
                    redeemTxHash: tx.Memos[0].data
                }
            }
        }
        else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.TEXT &&
            tx.Memos[0].type === MemoTypes.HOST_REG && tx.Memos[0].data) {

            const parts = tx.Memos[0].data.split(';');
            return {
                name: EvernodeEvents.HostRegistered,
                data: {
                    transaction: tx,
                    host: tx.Account,
                    token: parts[0],
                    instanceSize: parts[1],
                    location: parts[2]
                }
            }
        }
        else if (tx.Memos.length >= 1 && tx.Memos[0].type === MemoTypes.HOST_DEREG) {
            return {
                name: EvernodeEvents.HostDeregistered,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
            tx.Memos[0].type === MemoTypes.AUDIT_REQ) {

            return {
                name: EvernodeEvents.AuditRequest,
                data: {
                    transaction: tx,
                    auditor: tx.Account
                }
            }
        }
        else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
            tx.Memos[0].type === MemoTypes.AUDIT_SUCCESS) {

            return {
                name: EvernodeEvents.AuditSuccess,
                data: {
                    transaction: tx,
                    auditor: tx.Account
                }
            }
        } else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
            tx.Memos[0].type === MemoTypes.REFUND_RESP && tx.Memos[0].data) {
            const redeemTx = tx.Memos[0].data.substring(0, 64);
            const refundReqTx = tx.Memos[0].data.substring(64, 128);
            return {
                name: EvernodeEvents.RefundResp,
                data: {
                    transaction: tx,
                    redeemTx: redeemTx,
                    refundReqTx: refundReqTx,
                    amount: tx.Amount.value,
                    issuer: tx.Amount.issuer,
                    currency: tx.Amount.currency
                }
            }
        } else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
            tx.Memos[0].type === MemoTypes.AUDIT_REF && tx.Memos[0].data) {

            return {
                name: EvernodeEvents.AuditCheck,
                data: {
                    transaction: tx,
                    currency: tx.SendMax.currency,
                    issuer: tx.SendMax.issuer,
                    value: tx.SendMax.value,
                }
            }
        } else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
            tx.Memos[0].type === MemoTypes.REWARD_REF) {

            return {
                name: EvernodeEvents.Reward,
                data: {
                    transaction: tx,
                    host: tx.Destination,
                    amount: tx.Amount.value
                }
            }
        }

        return null;
    }
}

function getStateData(states, key) {
    const state = states.find(s => key === s.key);
    return state?.data;
}

function readUInt(buf, base = 32, isBE = true) {
    buf = Buffer.from(buf);
    switch (base) {
        case (8):
            return buf.readUInt8();
        case (16):
            return isBE ? buf.readUInt16BE() : buf.readUInt16LE();
        case (32):
            return isBE ? buf.readUInt32BE() : buf.readUInt32LE();
        case (64):
            return isBE ? Number(buf.readBigUInt64BE()) : Number(buf.readBigUInt64LE());
        default:
            throw 'Invalid base value';
    }
}
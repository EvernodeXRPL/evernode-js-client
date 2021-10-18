const { Global, MemoTypes, HookStateDefaults, HookStateKeys, HookEvents, MemoFormats } = require('./evernode-common')
const { XrplAccount, RippleAPIEvents } = require('./ripple-handler');
const { EventEmitter } = require('./event-emitter');
const rippleCodec = require('ripple-address-codec');

export class EvernodeHook {
    constructor(rippleAPI, hookAddress) {
        this.account = new XrplAccount(rippleAPI, (hookAddress || Global.DEFAULT_HOOK_ADDR));
        this.events = new EventEmitter();

        this.account.events.on(RippleAPIEvents.PAYMENT, async (data, error) => {
            if (error)
                console.error(error);
            else if (!data)
                console.log('Invalid transaction.');
            else {
                const ev = extractEvernodeHookEvent(data);
                if (ev)
                    this.events.emit(ev.name, ev.data);
            }
        });
    }

    async getHookStates() {
        let states = await this.account.getStates();
        states = states.filter(s => s.LedgerEntryType === 'HookState');
        states = states.map(s => {
            return {
                key: s.HookStateKey, //hex
                data: s.HookStateData //hex
            }
        });
        return states;
    }

    getStateData(states, key) {
        const state = states.find(s => key === s.key);
        return state?.data;
    }

    async getConfig() {
        let states = await this.getHookStates();
        states = states.map(s => {
            return {
                key: Buffer.from(s.key, 'hex'),
                data: Buffer.from(s.data, 'hex')
            }
        });

        let config = {};
        let buf = this.getStateData(states, HookStateKeys.HOST_REG_FEE);
        config.hostRegFee = buf ? readUInt(buf, 16) : HookStateDefaults.HOST_REG_FEE;

        buf = this.getStateData(states, HookStateKeys.MOMENT_SIZE);
        config.momentSize = buf ? readUInt(buf, 16) : HookStateDefaults.MOMENT_SIZE;

        buf = this.getStateData(states, HookStateKeys.REDEEM_WINDOW);
        config.redeemWindow = buf ? readUInt(buf, 16) : HookStateDefaults.REDEEM_WINDOW;

        buf = this.getStateData(states, HookStateKeys.MOMENT_BASE_IDX);
        config.momentBaseIdx = buf ? readUInt(buf, 64) : HookStateDefaults.MOMENT_BASE_IDX;

        return config;
    }

    async getHosts() {
        const states = (await this.getHookStates()).filter(s => s.key.startsWith(HookStateKeys.HOST_ADDR));
        const hosts = states.map(s => {
            return {
                address: rippleCodec.encodeAccountID(Buffer.from(s.key.slice(-40), 'hex')),
                token: Buffer.from(s.data.substr(8, 6), 'hex').toString()
            }
        });
        return hosts;
    }

    subscribe() {
        this.account.subscribe();
    }
}

function extractEvernodeHookEvent(tx) {

    if (!tx.Memos || tx.Memos.length === 0)
        return null;

    if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
        tx.Memos[0].type === MemoTypes.REDEEM && tx.Memos[0].data) {

        return {
            name: HookEvents.REDEEM,
            data: {
                txHash: tx.hash,
                user: tx.Account,
                host: tx.Amount.issuer,
                token: tx.Amount.currency,
                moments: parseInt(tx.Amount.value),
                payload: tx.Memos[0].data
            }
        }
    }
    else if (tx.Memos.length >= 2 && tx.Memos[0].format === MemoFormats.BINARY &&
        tx.Memos[0].type === MemoTypes.REDEEM_REF && tx.Memos[0].data &&
        tx.Memos[1].type === MemoTypes.REDEEM_RESP && tx.Memos[1].data) {

        const redeemTxHash = tx.Memos[0].data;
        const payload = tx.Memos[1].data;
        if (tx.Memos[1].format === MemoFormats.JSON) { // Format text/json means this is an error message. 
            const error = JSON.parse(payload);
            return {
                name: HookEvents.REDEEM_ERROR,
                data: {
                    redeemTxHash: redeemTxHash,
                    reason: error.reason
                }
            }
        }
        else {
            return {
                name: HookEvents.REDEEM_SUCCESS,
                data: {
                    redeemTxHash: redeemTxHash,
                    payload: payload
                }
            }
        }
    }
    else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
        tx.Memos[0].type === MemoTypes.REFUND && tx.Memos[0].data) {

        return {
            name: HookEvents.HOST_DEREGISTERED,
            data: {
                redeemTxHash: tx.Memos[0].data
            }
        }
    }
    else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.TEXT &&
        tx.Memos[0].type === MemoTypes.HOST_REG && tx.Memos[0].data) {

        const parts = tx.Memos[0].data.split(';');
        return {
            name: HookEvents.HOST_REGISTERED,
            data: {
                host: tx.Account,
                token: parts[0],
                instanceSize: parts[1],
                location: parts[2]
            }
        }
    }
    else if (tx.Memos.length >= 1 && tx.Memos[0].type === MemoTypes.HOST_DEREG) {
        return {
            name: HookEvents.HOST_DEREGISTERED,
            data: {
                host: tx.Account
            }
        }
    }
    else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
        tx.Memos[0].type === MemoTypes.AUDIT_REQ && tx.Memos[0].data) {

        return {
            name: HookEvents.AUDIT_REQUEST,
            data: {
                auditor: tx.Account
            }
        }
    }
    else if (tx.Memos.length >= 1 && tx.Memos[0].format === MemoFormats.BINARY &&
        tx.Memos[0].type === MemoTypes.AUDIT_SUCCESS && tx.Memos[0].data) {

        return {
            name: HookEvents.AUDIT_SUCCESS,
            data: {
                auditor: tx.Account
            }
        }
    }

    return null;
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
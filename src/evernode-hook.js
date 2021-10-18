const { Global, MemoTypes, HookStateDefaults, HookStateKeys, HookEvents } = require('./evernode-common')
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

function extractEvernodeHookEvent() {

    if (!data.Memos || data.Memos.length === 0)
        return null;

    if (data.Memos.length === 2 && data.Memos[0].format === MemoFormats.BINARY &&
        data.Memos[0].type === MemoTypes.REDEEM_REF && data.Memos[0].data &&
        data.Memos[1].type === MemoTypes.REDEEM_RESP && data.Memos[1].data) {

        const redeemTxHash = data.Memos[0].data;
        const payload = data.Memos[1].data;
        if (data.Memos[1].format === MemoFormats.JSON) { // Format text/json means this is an error message. 
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
const { EvernodeEvents, HookStateKeys, HookStateDefaults } = require('../evernode-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { DefaultValues } = require('../defaults');
const rippleCodec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { XflHelpers } = require('../xfl-helpers');

const HookEvents = {
    HostRegistered: EvernodeEvents.HostRegistered,
    HostDeregistered: EvernodeEvents.HostDeregistered,
    Redeem: EvernodeEvents.Redeem,
    RedeemSuccess: EvernodeEvents.RedeemSuccess,
    RedeemError: EvernodeEvents.RedeemError,
    Refund: EvernodeEvents.Refund,
    RefundSuccess: EvernodeEvents.RefundSuccess,
    Audit: EvernodeEvents.Audit,
    AuditSuccess: EvernodeEvents.AuditSuccess
}

class HookClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super((options.hookAddress || DefaultValues.hookAddress), null, Object.values(HookEvents), false, options);
    }

    async getHosts() {
        const states = (await this.xrplAcc.getHookStates()).filter(s => s.key.startsWith(HookStateKeys.HOST_ADDR));
        const hosts = states.map(s => {
            return {
                address: rippleCodec.encodeAccountID(Buffer.from(s.key.slice(-40), 'hex')),
                token: Buffer.from(s.data.substr(8, 6), 'hex').toString(),
                txHash: s.data.substr(14, 64),
                instanceSize: Buffer.from(s.data.substr(78, 120), 'hex').toString().replace(/\0/g, ''),
                location: Buffer.from(s.data.substr(198, 20), 'hex').toString().replace(/\0/g, ''),
            }
        });
        return hosts;
    }

    async getMoment(ledgerIndex = null) {
        const lv = ledgerIndex || this.xrplApi.ledgerIndex;
        const m = Math.floor((lv - this.hookConfig.momentBaseIdx) / this.hookConfig.momentSize);

        await Promise.resolve(); // Awaiter placeholder for future async requirements.
        return m;
    }

    async getRewardPool() {
        let states = await this.xrplAcc.getHookStates();
        states = states.map(s => {
            return {
                key: s.key,
                data: Buffer.from(s.data, 'hex')
            }
        });

        let buf = await this.getStateData(states, HookStateKeys.REWARD_POOL);
        if (buf) {
            buf = Buffer.from(buf);
            const xfl = buf.readBigInt64BE(0);
            return XflHelpers.toString(xfl);
        }
        else {
            return HookStateDefaults.REWARD_POOL;
        }
    }
}

module.exports = {
    HookEvents,
    HookClient
}
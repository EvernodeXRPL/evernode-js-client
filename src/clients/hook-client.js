const { EvernodeEvents, HookStateKeys, HookStateDefaults } = require('../evernode-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { DefaultValues } = require('../defaults');
const rippleCodec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { XflHelpers } = require('../xfl-helpers');
const { UtilHelpers } = require('../util-helpers');

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
        const states = (await this.getHookStates()).filter(s => s.key.startsWith(HookStateKeys.HOST_ADDR));
        const hosts = states.map(s => {
            return {
                address: rippleCodec.encodeAccountID(Buffer.from(s.key.slice(-40), 'hex')),
                token: Buffer.from(s.data.substr(8, 6), 'hex').toString(),
                countryCode: Buffer.from(s.data.substr(14, 4), 'hex').toString(),
                cpuMicroSec: Buffer.from(s.data.substr(18, 8), 'hex').readUInt32BE(0),
                ramMb: Buffer.from(s.data.substr(26, 8), 'hex').readUInt32BE(0),
                diskMb: Buffer.from(s.data.substr(34, 8), 'hex').readUInt32BE(0),
                description: Buffer.from(s.data.substr(58, 52), 'hex').toString().replace(/\0/g, ''),
                lastHeartbeatLedgerIndex: Number(Buffer.from(s.data.substr(214, 16), 'hex').readBigInt64BE(0)),
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

    async getMomentStartIndex(ledgerIndex = null) {
        const lv = ledgerIndex || this.xrplApi.ledgerIndex;
        const m = Math.floor((lv - this.hookConfig.momentBaseIdx) / this.hookConfig.momentSize);

        await Promise.resolve(); // Awaiter placeholder for future async requirements.
        return this.hookConfig.momentBaseIdx + (m * this.hookConfig.momentSize);
    }

    async getRewardPool() {
        let states = await this.getHookStates();
        states = states.map(s => {
            return {
                key: s.key,
                data: Buffer.from(s.data, 'hex')
            }
        });

        let buf = await UtilHelpers.getStateData(states, HookStateKeys.REWARD_POOL);
        if (buf) {
            buf = Buffer.from(buf);
            const xfl = buf.readBigInt64BE(0);
            return XflHelpers.toString(xfl);
        }
        else {
            return HookStateDefaults.REWARD_POOL;
        }
    }

    async getActiveHosts() {
        const hosts = await this.getHosts();
        const curMomentStartIdx = await this.getMomentStartIndex();

        return hosts.filter(h => h.lastHeartbeatLedgerIndex >= (curMomentStartIdx - (this.hookConfig.hostHeartbeatFreq * this.hookConfig.momentSize)));
    }
}

module.exports = {
    HookEvents,
    HookClient
}
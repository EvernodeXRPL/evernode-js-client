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
    AuditSuccess: EvernodeEvents.AuditSuccess,
    Recharge: EvernodeEvents.Recharge
}

class HookClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super((options.hookAddress || DefaultValues.hookAddress), null, Object.values(HookEvents), false, options);
    }

    async getAllHosts() {
        const states = (await this.getHookStates()).filter(s => s.key.startsWith(HookStateKeys.HOST_ADDR));
        const curMomentStartIdx = await this.getMomentStartIndex();
        const hosts = states.map(s => {
            const buf = Buffer.from(s.data, 'hex');
            const lastHeartbeatLedgerIndex = Number(buf.slice(107, 115).readBigInt64BE(0));
            return {
                address: rippleCodec.encodeAccountID(Buffer.from(s.key.slice(-40), 'hex')),
                token: buf.slice(4, 7).toString(),
                countryCode: buf.slice(7, 9).toString(),
                cpuMicroSec: buf.slice(9, 13).readUInt32BE(0),
                ramMb: buf.slice(13, 17).readUInt32BE(0),
                diskMb: buf.slice(17, 21).readUInt32BE(0),
                description: buf.slice(29, 55).toString().replace(/\0/g, ''),
                lastHeartbeatLedgerIndex: lastHeartbeatLedgerIndex,
                accumulatedAmount: Number(XflHelpers.toString(buf.slice(91, 99).readBigInt64BE(0))),
                lockedTokenAmount: Number(buf.slice(99, 107).readBigInt64BE(0)),
                active: (lastHeartbeatLedgerIndex > (this.hookConfig.hostHeartbeatFreq * this.hookConfig.momentSize) ?
                    (lastHeartbeatLedgerIndex >= (curMomentStartIdx - (this.hookConfig.hostHeartbeatFreq * this.hookConfig.momentSize))) :
                    (lastHeartbeatLedgerIndex > 0))
            }
        });
        return hosts;
    }

    async getActiveHosts() {
        const hosts = await this.getAllHosts();
        // Filter only active hosts.
        return hosts.filter(h => h.active);
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
}

module.exports = {
    HookEvents,
    HookClient
}
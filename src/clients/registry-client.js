const { EvernodeEvents, HookStateKeys } = require('../evernode-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { DefaultValues } = require('../defaults');
const rippleCodec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { XflHelpers } = require('../xfl-helpers');

const RegistryEvents = {
    HostRegistered: EvernodeEvents.HostRegistered,
    HostDeregistered: EvernodeEvents.HostDeregistered
}

class RegistryClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super((options.registryAddress || DefaultValues.registryAddress), null, Object.values(RegistryEvents), false, options);
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
                active: (lastHeartbeatLedgerIndex > (this.config.hostHeartbeatFreq * this.config.momentSize) ?
                    (lastHeartbeatLedgerIndex >= (curMomentStartIdx - (this.config.hostHeartbeatFreq * this.config.momentSize))) :
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
}

module.exports = {
    RegistryEvents,
    RegistryClient
}
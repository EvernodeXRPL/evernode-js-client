const { EvernodeEvents, HookStateKeys } = require('../evernode-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { DefaultValues } = require('../defaults');
const { UtilHelpers } = require('../util-helpers');

const RegistryEvents = {
    HostRegistered: EvernodeEvents.HostRegistered,
    HostDeregistered: EvernodeEvents.HostDeregistered
}

class RegistryClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super((options.registryAddress || DefaultValues.registryAddress), null, Object.values(RegistryEvents), false, options);
    }

    async getAllHosts() {
        const states = (await this.getStates()).filter(s => s.key.startsWith(HookStateKeys.PREFIX_HOST_ADDR));
        const curMomentStartIdx = await this.getMomentStartIndex();
        const hosts = states.map(s =>
            UtilHelpers.decodeRegistration(s.key, s.data, this.config.hostHeartbeatFreq, this.config.momentSize, curMomentStartIdx));
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
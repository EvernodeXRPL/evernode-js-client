const { EvernodeEvents } = require('../evernode-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { DefaultValues } = require('../defaults');

const RegistryEvents = {
    HostRegistered: EvernodeEvents.HostRegistered,
    HostDeregistered: EvernodeEvents.HostDeregistered
}

class RegistryClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super((options.registryAddress || DefaultValues.registryAddress), null, Object.values(RegistryEvents), false, options);
    }

    async getActiveHosts() {
        const hosts = await this.getHosts();
        // Filter only active hosts.
        return hosts.filter(h => h.active);
    }
}

module.exports = {
    RegistryEvents,
    RegistryClient
}
const { EvernodeEvents } = require('../evernode-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { DefaultValues } = require('../defaults');

const RegistryEvents = {
    HostRegistered: EvernodeEvents.HostRegistered,
    HostDeregistered: EvernodeEvents.HostDeregistered,
    HostRegUpdated: EvernodeEvents.HostRegUpdated,
    RegistryInitialized: EvernodeEvents.RegistryInitialized,
    Heartbeat: EvernodeEvents.Heartbeat,
    HostPostDeregistered: EvernodeEvents.HostPostDeregistered
}

class RegistryClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super((options.registryAddress || DefaultValues.registryAddress), null, Object.values(RegistryEvents), false, options);
    }

    async getActiveHosts() {
        let fullHostList = [];
        const hosts = await this.getHosts();
        if (hosts.nextPageToken) {
            fullHostList = fullHostList.concat(hosts.data);
            const nextHosts = await this.getHosts(null, null, hosts.nextPageToken);
            fullHostList = fullHostList.concat(nextHosts.nextPageToken ? nextHosts.data : nextHosts);

        } else {
            fullHostList = fullHostList.concat(hosts);
        }
        // Filter only active hosts.
        return fullHostList.filter(h => h.active);
    }
}

module.exports = {
    RegistryEvents,
    RegistryClient
}
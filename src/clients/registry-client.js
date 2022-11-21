const { EvernodeEvents } = require('../evernode-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { DefaultValues } = require('../defaults');

const RegistryEvents = {
    HostRegistered: EvernodeEvents.HostRegistered,
    HostDeregistered: EvernodeEvents.HostDeregistered,
    HostRegUpdated: EvernodeEvents.HostRegUpdated,
    RegistryInitialized: EvernodeEvents.RegistryInitialized,
    Heartbeat: EvernodeEvents.Heartbeat,
    HostPostDeregistered: EvernodeEvents.HostPostDeregistered,
    DeadHostPrune: EvernodeEvents.DeadHostPrune,
    HostRebate: EvernodeEvents.HostRebate
}

class RegistryClient extends BaseEvernodeClient {

    /**
     * Constructs a registry client instance.
     * @param {object} options [Optional] An object with 'rippledServer' URL and 'registryAddress'.
     */
    constructor(options = {}) {
        super((options.registryAddress || DefaultValues.registryAddress), null, Object.values(RegistryEvents), false, options);
    }

    /**
     * Gets all the active hosts registered in Evernode without paginating.
     * @returns The list of active hosts.
     */
    async getActiveHosts() {
        let fullHostList = [];
        const hosts = await this.getHosts();
        if (hosts.nextPageToken) {
            let currentPageToken = hosts.nextPageToken;
            let nextHosts = null;
            fullHostList = fullHostList.concat(hosts.data);
            while (currentPageToken) {
                nextHosts = await this.getHosts(null, null, currentPageToken);
                fullHostList = fullHostList.concat(nextHosts.nextPageToken ? nextHosts.data : nextHosts);
                currentPageToken = nextHosts.nextPageToken;
            }
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
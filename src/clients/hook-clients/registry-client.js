const { BaseEvernodeClient } = require("../base-evernode-client");
const { EvernodeEvents } = require('../../evernode-common');

const RegistryEvents = {
    HostRegistered: EvernodeEvents.HostRegistered,
    HostDeregistered: EvernodeEvents.HostDeregistered,
    HostRegUpdated: EvernodeEvents.HostRegUpdated,
    DeadHostPrune: EvernodeEvents.DeadHostPrune,
    HostTransfer: EvernodeEvents.HostTransfer,
    HostRebate: EvernodeEvents.HostRebate,
    HostReputationUpdated: EvernodeEvents.HostReputationUpdated
}

class RegistryClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super(options.registryAddress, null, Object.values(RegistryEvents), false, options);
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
    RegistryClient,
    RegistryEvents
}
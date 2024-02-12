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
     * Gets all the active hosts registered in ledger.
     * @returns The list of active hosts.
     */
    async getActiveHostsFromLedger() {
        const hosts = await this.getAllHostsFromLedger();
        // Filter only active hosts.
        return hosts.filter(h => h.active);
    }
}

module.exports = {
    RegistryClient,
    RegistryEvents
}
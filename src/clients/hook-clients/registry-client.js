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

/**
 * RegistryClient is responsible for managing registry operations in Evernode.
 * It interacts with the XRP Ledger using the registry address and listens for specific registry events.
 * 
 * @extends BaseEvernodeClient
 */
class RegistryClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super(options.registryAddress, null, Object.values(RegistryEvents), false, options);
    }

    /**
     * Retrieves all active hosts registered in the ledger.
     * @returns {Promise<Array>} - A promise that resolves to an array of active hosts.
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
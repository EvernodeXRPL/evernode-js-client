const { BaseEvernodeClient } = require("../base-evernode-client");
const { EvernodeEvents } = require('../../evernode-common');

/**
 * Following registry-specific events can be subscribed from Evernode client instances.
 * @property {string} HostRegistered - Triggered when host registration event is received to the registry.
 * @property {string} HostDeregistered - Triggered when host de-registration event is received to the registry.
 * @property {string} HostRegUpdated - Triggered when host sends an update info request.
 * @property {string} DeadHostPrune - Triggered when dead host prune request is received to the registry.
 * @property {string} HostTransfer - Triggered when host transfer is requested by the host.
 * @property {string} HostRebate - Triggered when host rebate is requested by the host.
 * @property {string} HostReputationUpdated - Triggered when host reputation is updated.
 */
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

    /**
     * Creates an instance of RegistryClient.
     * @param {Object} [options={}] - A JSON object of options for initializing the RegistryClient.
     * @param {string} options.registryAddress - The Registry Hook Account Xahau address.
     * @param {string} [options.rippledServer] - (Optional) The Rippled server URL.
     * @example
     * const registryClient = new RegistryClient({
     *     registryAddress: 'rQUhXd7sopuga3taru3jfvc1BgVbscrb1X',
     *     rippledServer: 'wss://hooks-testnet-v3.xrpl-labs.com'
     * });
     */
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
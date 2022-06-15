const { EvernodeEvents } = require('../evernode-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { DefaultValues } = require('../defaults');

const RegistryEvents = {
    HostRegistered: EvernodeEvents.HostRegistered,
    HostDeregistered: EvernodeEvents.HostDeregistered,
    HostRegUpdated: EvernodeEvents.HostRegUpdated,
    RegistryInitialized: EvernodeEvents.RegistryInitialized,
    Heartbeat: EvernodeEvents.Heartbeat,
    NftOfferCreate: EvernodeEvents.NftOfferCreate
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

    async getHookStates() {
        const hookNamespace = (await this.xrplAcc.getInfo())?.HookNamespaces[0];
        if (hookNamespace)
            return await this.xrplAcc.getNamespaceEntries(hookNamespace);
        return [];
    }
}

module.exports = {
    RegistryEvents,
    RegistryClient
}
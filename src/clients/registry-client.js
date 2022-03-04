const { EvernodeEvents, EvernodeConstants } = require('../evernode-common');
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

    async getAllHosts() {
        const hosts = await this._firestoreHandler.getDocuments(EvernodeConstants.HOSTS_INDEX);
        const curMomentStartIdx = await this.getMomentStartIndex();
        return hosts.map(h => {
            return {
                ...h,
                active: (h.lastHeartbeatLedger > (this.config.hostHeartbeatFreq * this.config.momentSize) ?
                    (h.lastHeartbeatLedger >= (curMomentStartIdx - (this.config.hostHeartbeatFreq * this.config.momentSize))) :
                    (h.lastHeartbeatLedger > 0))
            };
        })
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
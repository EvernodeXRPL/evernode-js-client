const DefaultValues = {
    governorAddress: 'rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL',
    rippledServer: 'wss://hooks-testnet-v3.xrpl-labs.com',
    fallbackRippledServers: [], //Default fallback server list should be defined here.
    xrplApi: null,
    stateIndexId: 'evernodeindex',
    networkID: 21338
}

const HookTypes = {
    governor: 'GOVERNOR',
    registry: 'REGISTRY',
    heartbeat: 'HEARTBEAT'
}

class Defaults {
    /**
     * Override Evernode default configs.
     * @param {object} newDefaults Configurations to override `{ governorAddress: '{string} governor xrpl address', rippledServer: '{string} rippled server url', xrplApi: '{XrplApi} xrpl instance', stateIndexId: '{string} firestore index', networkID: '{number} rippled network id' }`
     */
    static set(newDefaults) {
        Object.assign(DefaultValues, newDefaults)
    }

    /**
     * Read Evernode default configs.
     * @returns The Object of Evernode configs
     */
    static get() {
        return { ...DefaultValues };
    }
}

module.exports = {
    DefaultValues,
    Defaults,
    HookTypes
}
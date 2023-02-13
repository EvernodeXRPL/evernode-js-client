const DefaultValues = {
    governorAddress: 'r9keGGSTDRg58RuiWYAQYuAAA8nqMG7EP5',
    rippledServer: 'wss://hooks-testnet-v3.xrpl-labs.com',
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
    static set(newDefaults) {
        Object.assign(DefaultValues, newDefaults)
    }

    static get() {
        return { ...DefaultValues };
    }
}

module.exports = {
    DefaultValues,
    Defaults,
    HookTypes
}
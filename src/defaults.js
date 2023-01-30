const DefaultValues = {
    governorAddress: 'rDxkQ7Jaq1igBmNNavXqsZ5vyEoYRKgT8B',
    rippledServer: 'wss://hooks-testnet-v2.xrpl-labs.com',
    xrplApi: null,
    stateIndexId: 'evernodeindex'
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
const DefaultValues = {
    governorAddress: 'raaFre81618XegCrzTzVotAmarBcqNSAvK',
    rippledServer: 'wss://hooks-testnet-v2.xrpl-labs.com',
    xrplApi: null,
    stateIndexId: 'evernodeindex'
}

const HookAccountTypes = {
    governorHook: 'GOVERNOR_HOOK',
    registryHook: 'REGISTRY_HOOK',
    heartbeatHook: 'HEARTBEAT_HOOK'
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
    HookAccountTypes
}
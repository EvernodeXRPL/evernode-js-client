const DefaultValues = {
    registryAddress: 'raaFre81618XegCrzTzVotAmarBcqNSAvK',
    rippledServer: 'wss://hooks-testnet-v2.xrpl-labs.com',
    xrplApi: null,
    stateIndexId: 'evernodeindex'
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
    Defaults
}
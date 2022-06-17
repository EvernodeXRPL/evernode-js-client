const DefaultValues = {
    registryAddress: 'rDPqJv7zu6DfeXexAYseABNM2hT2j2rpHv',
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
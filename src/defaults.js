const DefaultValues = {
    registryAddress: 'rDPqJv7zu6DfeXexAYseABNM2hT2j2rpHv',
    rippledServer: 'wss://xls20-sandbox.rippletest.net:51233',
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
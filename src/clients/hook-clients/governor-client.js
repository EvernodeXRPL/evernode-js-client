const { DefaultValues } = require("../../defaults");

const GovernorEvents = {
    RegistryInitialized: EvernodeEvents.RegistryInitialized
}

class GovernorClient {
    constructor(options = {}) {
        super((options.governorAddress || DefaultValues.governorAddress), null, Object.values(GovernorEvents), false, options);
    }

    on(event, handler) {
        this.events.on(event, handler)
    }
}

module.exports = {
    GovernorClient,
    GovernorEvents
}
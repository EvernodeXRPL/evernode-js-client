const { BaseEvernodeClient } = require("../../../dist");
const { DefaultValues } = require("../../defaults");

const GovernorEvents = {
    RegistryInitialized: EvernodeEvents.RegistryInitialized
}

class GovernorClient extends BaseEvernodeClient {
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
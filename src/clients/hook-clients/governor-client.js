const { BaseEvernodeClient } = require("../base-evernode-client");
const { DefaultValues } = require("../../defaults");
const { EvernodeEvents } = require('../../evernode-common');

const GovernorEvents = {
    RegistryInitialized: EvernodeEvents.RegistryInitialized
}

class GovernorClient extends BaseEvernodeClient {
    constructor(options = {}) {
        super((options.governorAddress || DefaultValues.governorAddress), null, Object.values(GovernorEvents), false, options);
    }
}

module.exports = {
    GovernorClient,
    GovernorEvents
}
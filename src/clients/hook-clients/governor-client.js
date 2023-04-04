const { BaseEvernodeClient } = require("../base-evernode-client");
const { DefaultValues } = require("../../defaults");
const { EvernodeEvents } = require('../../evernode-common');

const GovernorEvents = {
    Initialized: EvernodeEvents.Initialized,
    CandidateProposed: EvernodeEvents.CandidateProposed,
    CandidateWithdrew: EvernodeEvents.CandidateWithdrew,
    ChildHookUpdated: EvernodeEvents.ChildHookUpdated,
    GovernanceModeChanged: EvernodeEvents.GovernanceModeChanged,
    DudHostReported: EvernodeEvents.DudHostReported,
    DudHostRemoved: EvernodeEvents.DudHostRemoved,
    DudHostStatusChanged: EvernodeEvents.DudHostStatusChanged,
    FallbackToPiloted: EvernodeEvents.FallbackToPiloted,
    NewHookStatusChanged: EvernodeEvents.NewHookStatusChanged,
    LinkedDudHostCandidateRemoved: EvernodeEvents.LinkedDudHostCandidateRemoved
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
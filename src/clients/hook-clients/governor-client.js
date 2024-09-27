const { BaseEvernodeClient } = require("../base-evernode-client");
const { Defaults } = require("../../defaults");
const { EvernodeEvents } = require('../../evernode-common');

const GovernorEvents = {
    Initialized: EvernodeEvents.Initialized,
    CandidateProposed: EvernodeEvents.CandidateProposed,
    CandidateWithdrawn: EvernodeEvents.CandidateWithdrawn,
    ChildHookUpdated: EvernodeEvents.ChildHookUpdated,
    GovernanceModeChanged: EvernodeEvents.GovernanceModeChanged,
    DudHostReported: EvernodeEvents.DudHostReported,
    DudHostRemoved: EvernodeEvents.DudHostRemoved,
    DudHostStatusChanged: EvernodeEvents.DudHostStatusChanged,
    FallbackToPiloted: EvernodeEvents.FallbackToPiloted,
    NewHookStatusChanged: EvernodeEvents.NewHookStatusChanged,
    LinkedDudHostCandidateRemoved: EvernodeEvents.LinkedDudHostCandidateRemoved
}

/**
 * GovernorClient is responsible for managing governor operations in Evernode.
 * It interacts with the XRP Ledger using the governor address and listens for specific governor events.
 * 
 * @extends BaseEvernodeClient
 */
class GovernorClient extends BaseEvernodeClient {
    constructor(options = {}) {
        super((options.governorAddress || Defaults.values.governorAddress), null, Object.values(GovernorEvents), false, options);
    }
}

module.exports = {
    GovernorClient,
    GovernorEvents
}
const { BaseEvernodeClient } = require("../base-evernode-client");
const { Defaults } = require("../../defaults");
const { EvernodeEvents } = require('../../evernode-common');

/**
 * Following governor-specific events can be subscribed from Evernode client instances.
 * @property {string} Initialized - Triggered when governor receives a hook initialization.
 * @property {string} CandidateProposed - Triggered when governor receives a new candidate proposal.
 * @property {string} CandidateWithdrawn - Triggered when candidate withdrawal is requested.
 * @property {string} ChildHookUpdated - Triggered when registry or heartbeat hook is updated.
 * @property {string} GovernanceModeChanged - Triggered when governor receives a request to change the governance mode.
 * @property {string} DudHostReported - Triggered when dud host is reported.
 * @property {string} DudHostRemoved - Triggered when dud host is removed.
 * @property {string} DudHostStatusChanged - Triggered when dud host candidate election status is changed.
 * @property {string} FallbackToPiloted - Triggered when governance mode is changed to piloted mode.
 * @property {string} NewHookStatusChanged - Triggered when new hook candidate election status is changed.
 * @property {string} LinkedDudHostCandidateRemoved - Triggered when a host related to dud host candidate is removed by de-registration/transfer or prune.
 */
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
 * @extends BaseEvernodeClient
 */
class GovernorClient extends BaseEvernodeClient {
    /**
     * Creates an instance of GovernorClient.
     * @param {Object} [options={}] - A JSON object of options for initializing the GovernorClient.
     * @param {string} [options.governorAddress] - (Optional) The Governor Hook Account Xahau address. 
     * If not provided, the address from the 'Defaults' configuration will be used.
     * @example
     * const governorClient = new GovernorClient({
     *     governorAddress: "rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL"
     * });
     */
    constructor(options = {}) {
        super((options.governorAddress || Defaults.values.governorAddress), null, Object.values(GovernorEvents), false, options);
    }
}

module.exports = {
    GovernorClient,
    GovernorEvents
}
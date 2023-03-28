const { Buffer } = require('buffer');
const { EventTypes, HookParamKeys } = require('../evernode-common');
const { StateHelpers } = require('../state-helpers');
const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');

const CANDIDATE_VOTE_UNIQUE_ID_PARAM_OFFSET = 0;
const CANDIDATE_VOTE_VALUE_PARAM_OFFSET = 32;
const CANDIDATE_VOTE_PARAM_SIZE = 33;

const FoundationEvents = {}

class FoundationClient extends BaseEvernodeClient {

    /**
     * Constructs a tenant client instance.
     * @param {string} xrpAddress XRPL address of the tenant.
     * @param {string} XRPL secret of the tenant.
     * @param {object} options [Optional] An object with 'rippledServer' URL and 'governorAddress'.
     */
    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(FoundationEvents), false, options);
    }

    async propose(hashes, shortName, options = {}) {
        if (this.xrplAcc.address !== this.config.foundationAddress)
            throw `Invalid foundation address ${this.xrplAcc.address}.`;

        return await super._propose(hashes, shortName, options);
    }

    async withdraw(candidateId, options = {}) {
        if (this.xrplAcc.address !== this.config.foundationAddress)
            throw `Invalid foundation address ${this.xrplAcc.address}.`;

        return await super._withdraw(candidateId, options);
    }

    /**
     * Vote for a hook candidate.
     * @param {string} candidateId Id of the candidate in hex format.
     * @param {int} vote Vote value CandidateVote (0 - Reject, 1 - Support).
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async vote(candidateId, vote, options = {}) {
        if (this.xrplAcc.address !== this.config.foundationAddress)
            throw `Invalid foundation address ${this.xrplAcc.address}.`;

        const voteBuf = Buffer.alloc(CANDIDATE_VOTE_PARAM_SIZE);
        Buffer.from(candidateId, 'hex').copy(voteBuf, CANDIDATE_VOTE_UNIQUE_ID_PARAM_OFFSET);
        voteBuf.writeUInt8(vote, CANDIDATE_VOTE_VALUE_PARAM_OFFSET)

        return await this.xrplAcc.makePayment(this.config.heartbeatAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            null,
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.CANDIDATE_VOTE },
                    { name: HookParamKeys.PARAM_EVENT_DATA1_KEY, value: voteBuf.toString('hex').toUpperCase() }
                ],
                ...options.transactionOptions
            });
    }

    async reportDudHost(hostAddress, options = {}) {
        if (this.xrplAcc.address !== this.config.foundationAddress)
            throw `Invalid foundation address ${this.xrplAcc.address}.`;

        return await this._reportDudHost(hostAddress, options);
    }

    /**
     * Vote for a dud host.
     * @param {string} hostAddress Address of the dud host.
     * @param {int} vote Vote value CandidateVote (0 - Reject, 1 - Support).
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async voteDudHost(hostAddress, vote, options = {}) {
        if (this.xrplAcc.address !== this.config.foundationAddress)
            throw `Invalid foundation address ${this.xrplAcc.address}.`;

        const candidateId = StateHelpers.getDudHostCandidateId(hostAddress);
        return await this.vote(candidateId, vote, options);
    }

    /**
     * Vote for a piloted mode.
     * @param {int} vote Vote value CandidateVote (0 - Reject, 1 - Support).
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async votePilotedMode(vote, options = {}) {
        if (this.xrplAcc.address !== this.config.foundationAddress)
            throw `Invalid foundation address ${this.xrplAcc.address}.`;

        const candidateId = StateHelpers.getPilotedModeCandidateId();
        return await this.vote(candidateId, vote, options);
    }

    /**
     * Change the governance mode.
     * @param {int} mode Mode  (1 - Piloted, 2 - CoPiloted, 3 - AutoPiloted).
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async changeGovernanceMode(mode, options = {}) {
        if (this.xrplAcc.address !== this.config.foundationAddress)
            throw `Invalid foundation address ${this.xrplAcc.address}.`;

        const modeBuf = Buffer.alloc(1);
        modeBuf.writeUInt8(mode);

        return await this.xrplAcc.makePayment(this.governorAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            null,
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.GOVERNANCE_MODE_CHANGE },
                    { name: HookParamKeys.PARAM_EVENT_DATA1_KEY, value: modeBuf.toString('hex').toUpperCase() }
                ],
                ...options.transactionOptions
            });
    }
}

module.exports = {
    FoundationEvents,
    FoundationClient
}
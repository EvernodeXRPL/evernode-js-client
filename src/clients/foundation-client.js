const { Buffer } = require('buffer');
const { MemoTypes, MemoFormats } = require('../evernode-common');
const { StateHelpers } = require('../state-helpers');
const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');

const CANDIDATE_VOTE_UNIQUE_ID_MEMO_OFFSET = 0;
const CANDIDATE_VOTE_VALUE_MEMO_OFFSET = 32;
const CANDIDATE_VOTE_MEMO_SIZE = 33;

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

        const voteBuf = Buffer.alloc(CANDIDATE_VOTE_MEMO_SIZE);
        Buffer.from(candidateId, 'hex').copy(voteBuf, CANDIDATE_VOTE_UNIQUE_ID_MEMO_OFFSET);
        voteBuf.writeUInt8(vote, CANDIDATE_VOTE_VALUE_MEMO_OFFSET)

        return await this.xrplAcc.makePayment(this.config.heartbeatAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [
                { type: MemoTypes.CANDIDATE_VOTE, format: MemoFormats.HEX, data: voteBuf.toString('hex').toUpperCase() }
            ],
            options.transactionOptions);
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
            [
                { type: MemoTypes.GOVERNANCE_MODE_CHANGE, format: MemoFormats.HEX, data: modeBuf.toString('hex').toUpperCase() }
            ],
            options.transactionOptions);
    }
}

module.exports = {
    FoundationEvents,
    FoundationClient
}
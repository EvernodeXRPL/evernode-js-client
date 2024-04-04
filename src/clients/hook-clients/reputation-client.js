const { StateHelpers } = require("../../state-helpers");
const { BaseEvernodeClient } = require("../base-evernode-client");

const ReputationEvents = {}

class ReputationClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super(options.reputationAddress, null, Object.values(ReputationEvents), false, options);
    }

    /**
     * Get reputation info of given host reputation orderId.
     */
    async getReputationInfoByOrderedId(hostReputationOrderedId) {
        try {
            const moment = await this.getMoment();
            const orderedIdStateKey = StateHelpers.generateHostReputationOrderedIdStateKey(hostReputationOrderedId, moment);
            const orderedIdStateIndex = StateHelpers.getHookStateIndex(this.xrplAcc.address, orderedIdStateKey);
            const orderedIdLedgerEntry = await this.xrplApi.getLedgerEntry(orderedIdStateIndex);
            const orderedIdStateData = orderedIdLedgerEntry?.HookStateData;

            if (orderedIdStateData) {
                const orderedIdStateDecoded = StateHelpers.decodeHostReputationOrderedIdState(Buffer.from(orderedIdStateKey, 'hex'), Buffer.from(orderedIdStateData, 'hex'));
                return await this._getReputationInfoByAddress(orderedIdStateDecoded.address);
            }
        }
        catch (e) {
            // If the exception is entryNotFound from Rippled there's no entry for the host, So return null.
            if (e?.data?.error !== 'entryNotFound')
                throw e;
        }

        return null;
    }

    /**
     * Get reputation info of the moment.
     */
    async getReputationInfo() {
        try {
            const moment = await this.getMoment();
            const hostCountStateKey = StateHelpers.generateReputationHostCountStateKey(moment);
            const hostCountStateIndex = StateHelpers.getHookStateIndex(this.xrplAcc.address, hostCountStateKey);
            const hostCountLedgerEntry = await this.xrplApi.getLedgerEntry(hostCountStateIndex);
            const hostCountStateData = hostCountLedgerEntry?.HookStateData;

            if (hostCountStateData) {
                const hostCountStateDecoded = StateHelpers.decodeReputationHostCountState(Buffer.from(hostCountStateKey, 'hex'), Buffer.from(hostCountStateData, 'hex'));
                return hostCountStateDecoded;
            }
        }
        catch (e) {
            // If the exception is entryNotFound from Rippled there's no entry for the host, So return null.
            if (e?.data?.error !== 'entryNotFound')
                throw e;
        }

        return null;
    }
}

module.exports = {
    ReputationClient,
    ReputationEvents
}
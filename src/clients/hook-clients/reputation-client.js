const { StateHelpers } = require("../../state-helpers");
const { BaseEvernodeClient } = require("../base-evernode-client");

const ReputationEvents = {}

/**
 * ReputationClient is responsible for managing reputation operations in Evernode.
 * It interacts with the XRP Ledger using the reputation address and listens for specific reputation events.
 * @extends BaseEvernodeClient
 */
class ReputationClient extends BaseEvernodeClient {

    /**
     * Creates an instance of ReputationClient.
     * @param {Object} [options={}] - A JSON object of options for initializing the ReputationClient.
     * @param {string} options.reputationAddress - The Reputation Hook Account Xahau address.
     * @example
     * const reputationClient = new reputationAddress({
     *     reputationAddress: 'rQUhXd7sopuga3taru3jfvc1BgVbscrb1X',
     * });
     */
    constructor(options = {}) {
        super(options.reputationAddress, null, Object.values(ReputationEvents), false, options);
    }

    /**
     * Get reputation contract info of given host reputation orderedId.
     * @param {number} orderedId Reputation order id of the host.
     * @param {number} moment (optional) Moment to get reputation contract info for.
     * @returns Reputation contract info object.
     */
    async getReputationContractInfoByOrderedId(orderedId, moment = null) {
        try {
            const repMoment = moment ?? await this.getMoment();
            const addressInfo = await this.getReputationAddressByOrderedId(orderedId, repMoment);
            if (addressInfo?.hostAddress) {
                let data = addressInfo;

                const contract = await this.getReputationContractInfoByAddress(addressInfo?.hostAddress, repMoment);
                if (contract) {
                    data = {
                        ...data,
                        contract: contract
                    }
                }
                return data;
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
     * Get reputation info of given host reputation orderedId.
     * @param {number} orderedId Reputation order id of the host.
     * @param {number} moment (optional) Moment to get reputation info for.
     * @returns Reputation info object.
     */
    async getReputationInfoByOrderedId(orderedId, moment = null) {
        try {
            const repMoment = moment ?? await this.getMoment();
            const addressInfo = this.getReputationAddressByOrderedId(orderedId, repMoment);

            if (addressInfo?.hostAddress) {
                const info = await this.getReputationInfoByAddress(addressInfo?.hostAddress);
                return info ? { ...addressInfo, ...info } : addressInfo;
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
     * @param {number} moment (optional) Moment to get reputation info for.
     * @returns Reputation info object.
     */
    async getReputationInfo(moment = null) {
        try {
            const repMoment = moment ?? await this.getMoment();
            const hostCountStateKey = StateHelpers.generateReputationHostCountStateKey(repMoment);
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
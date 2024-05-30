const codec = require('ripple-address-codec');
const { StateHelpers } = require("../../state-helpers");
const { XrplAccount } = require("../../xrpl-account");
const { BaseEvernodeClient } = require("../base-evernode-client");

const ReputationEvents = {}

class ReputationClient extends BaseEvernodeClient {

    constructor(options = {}) {
        super(options.reputationAddress, null, Object.values(ReputationEvents), false, options);
    }

    async getReputationContractInfoByOrderedId(hostReputationOrderedId, moment = null) {
        try {
            const repMoment = moment ?? await this.getMoment();
            const addressInfo = await this.getReputationAddressByOrderId(hostReputationOrderedId, repMoment);
            if (addressInfo?.address) {
                let data = addressInfo;

                const hostRepAcc = new XrplAccount(addressInfo?.address, null, { xrplApi: this.xrplApi });
                const [wl, rep] = await Promise.all([
                    hostRepAcc.getWalletLocator(),
                    hostRepAcc.getDomain()]);

                if (wl && rep && rep.length > 0) {
                    const hostReputationAccId = wl.slice(0, 40);
                    const hostAddress = codec.encodeAccountID(Buffer.from(hostReputationAccId, 'hex'));
                    const hostAcc = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });

                    const repBuf = Buffer.from(rep, 'hex');
                    const publicKey = repBuf.slice(0, ReputationConstants.REP_INFO_PEER_PORT_OFFSET).toString('hex').toLocaleLowerCase();
                    const peerPort = repBuf.readUInt16LE(ReputationConstants.REP_INFO_PEER_PORT_OFFSET);
                    const instanceMoment = (repBuf.length > ReputationConstants.REP_INFO_MOMENT_OFFSET) ? Number(repBuf.readBigUInt64LE(ReputationConstants.REP_INFO_MOMENT_OFFSET)) : null;
                    const domain = await hostAcc.getDomain();

                    if (instanceMoment === repMoment) {
                        data = {
                            ...data,
                            contract: {
                                domain: domain,
                                pubkey: publicKey,
                                peerPort: peerPort
                            }
                        }
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
     * Get reputation info of given host reputation orderId.
     * @param {number} hostReputationOrderedId Reputation order id of the host.
     * @param {number} moment (optional) Moment to get reputation info for.
     * @returns Reputation info object.
     */
    async getReputationInfoByOrderedId(hostReputationOrderedId, moment = null) {
        try {
            const repMoment = moment ?? await this.getMoment();
            const addressInfo = this.getReputationAddressByOrderId(hostReputationOrderedId, repMoment);

            if (addressInfo?.address) {
                const info = await this.getReputationInfoByAddress(addressInfo?.address, repMoment);
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
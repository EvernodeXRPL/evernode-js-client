const { BaseEvernodeClient } = require("../base-evernode-client");
const { EvernodeEvents } = require('../../evernode-common');

/**
 * Following heartbeat-specific events can be subscribed from Evernode client instances.
 * @property {string} Heartbeat - Triggered when a heartbeat from a host is received.
 * @property {string} FoundationVoted - Triggered when foundation vote for a candidate is received.
 */
const HeartbeatEvents = {
    Heartbeat: EvernodeEvents.Heartbeat,
    FoundationVoted: EvernodeEvents.FoundationVoted
}

/**
 * HeartbeatClient is responsible for managing heartbeat operations in Evernode.
 * It interacts with the XRP Ledger using the heartbeat address and listens for specific heartbeat events.
 * 
 * @extends BaseEvernodeClient
 */
class HeartbeatClient extends BaseEvernodeClient {
    /**
     * Creates an instance of HeartbeatClient.
     * @param {Object} [options={}] - A JSON object of options for initializing the HeartbeatClient.
     * @param {string} options.heartbeatAddress - The Heartbeat Hook Account Xahau address.
     * @param {string} [options.rippledServer] - (Optional) The Rippled server URL.
     * @example
     * const heartbeatClient = new HeartbeatClient({
     *     heartbeatAddress: 'raPSFU999HcwpyRojdNh2i96T22gY9fgxL',
     *     rippledServer: 'wss://hooks-testnet-v3.xrpl-labs.com'
     * });
     */
    constructor(options = {}) {
        super(options.heartbeatAddress, null, Object.values(HeartbeatEvents), false, options);
    }
}

module.exports = {
    HeartbeatClient,
    HeartbeatEvents
}
const { BaseEvernodeClient } = require("../base-evernode-client");
const { EvernodeEvents } = require('../../evernode-common');

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
    constructor(options = {}) {
        super(options.heartbeatAddress, null, Object.values(HeartbeatEvents), false, options);
    }
}

module.exports = {
    HeartbeatClient,
    HeartbeatEvents
}
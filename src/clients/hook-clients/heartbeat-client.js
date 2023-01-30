const { BaseEvernodeClient } = require("../base-evernode-client");
const { EvernodeEvents } = require('../../evernode-common');

const HeartbeatEvents = {
    Heartbeat: EvernodeEvents.Heartbeat
}

class HeartbeatClient extends BaseEvernodeClient {
    constructor(options = {}) {
        super(options.heartbeatAddress, null, Object.values(HeartbeatEvents), false, options);
    }
}

module.exports = {
    HeartbeatClient,
    HeartbeatEvents
}
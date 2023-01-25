const { BaseEvernodeClient } = require("../base-evernode-client");

const HeartbeatEvents = {
    Heartbeat: EvernodeEvents.Heartbeat
}

class HeartbeatClient extends BaseEvernodeClient {
    constructor(options = {}) {
        super(options.heartbeatAddress, null, Object.values(HeartbeatEvents), false, options);
    }

    on(event, handler) {
        this.events.on(event, handler)
    }
}

module.exports = {
    HeartbeatClient,
    HeartbeatEvents
}
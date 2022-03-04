const { Buffer } = require('buffer');
const { StateHelpers } = require('./state-helpers');

// Utility helper functions.
class UtilHelpers {

    static getStateData(states, key) {
        const state = states.find(s => key === s.key);
        if (!state)
            throw `State key '${key}' not found.`;

        return state.data;
    }

    static readUInt(buf, base = 32, isBE = true) {
        buf = Buffer.from(buf);
        switch (base) {
            case (8):
                return buf.readUInt8();
            case (16):
                return isBE ? buf.readUInt16BE() : buf.readUInt16LE();
            case (32):
                return isBE ? buf.readUInt32BE() : buf.readUInt32LE();
            case (64):
                return isBE ? Number(buf.readBigUInt64BE()) : Number(buf.readBigUInt64LE());
            default:
                throw 'Invalid base value';
        }
    }

    static decodeRegistration(key, hex, hostHeartbeatFreq, momentSize, curMomentStartIdx) {
        const keyBuf = Buffer.from(key, 'hex');
        const buf = Buffer.from(hex, 'hex');
        const lastHeartbeatLedgerIndex = Number(buf.slice(107, 115).readBigInt64BE(0));
        return {
            address: rippleCodec.encodeAccountID(Buffer.from(s.key.slice(-40), 'hex')),
            ...StateHelpers.decodeHostAddressState(keyBuf, buf),
            active: (lastHeartbeatLedgerIndex > (hostHeartbeatFreq * momentSize) ?
                (lastHeartbeatLedgerIndex >= (curMomentStartIdx - (hostHeartbeatFreq * momentSize))) :
                (lastHeartbeatLedgerIndex > 0))
        }
    }
}

module.exports = {
    UtilHelpers
}
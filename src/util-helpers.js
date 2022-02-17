const rippleCodec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { XflHelpers } = require('./xfl-helpers');

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

    static decodeRegistration(hex, hostHeartbeatFreq, momentSize, curMomentStartIdx) {
        const buf = Buffer.from(hex, 'hex');
        const lastHeartbeatLedgerIndex = Number(buf.slice(107, 115).readBigInt64BE(0));
        return {
            address: rippleCodec.encodeAccountID(Buffer.from(s.key.slice(-40), 'hex')),
            token: buf.slice(4, 7).toString(),
            countryCode: buf.slice(7, 9).toString(),
            cpuMicroSec: buf.slice(9, 13).readUInt32BE(0),
            ramMb: buf.slice(13, 17).readUInt32BE(0),
            diskMb: buf.slice(17, 21).readUInt32BE(0),
            description: buf.slice(29, 55).toString().replace(/\0/g, ''),
            lastHeartbeatLedgerIndex: lastHeartbeatLedgerIndex,
            accumulatedAmount: Number(XflHelpers.toString(buf.slice(91, 99).readBigInt64BE(0))),
            lockedTokenAmount: Number(buf.slice(99, 107).readBigInt64BE(0)),
            active: (lastHeartbeatLedgerIndex > (hostHeartbeatFreq * momentSize) ?
                (lastHeartbeatLedgerIndex >= (curMomentStartIdx - (hostHeartbeatFreq * momentSize))) :
                (lastHeartbeatLedgerIndex > 0))
        }
    }
}

module.exports = {
    UtilHelpers
}
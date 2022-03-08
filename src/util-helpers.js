const { Buffer } = require('buffer');

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
}

module.exports = {
    UtilHelpers
}
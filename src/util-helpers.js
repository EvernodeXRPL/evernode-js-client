const { Buffer } = require('buffer');
const { XflHelpers } = require('./xfl-helpers');
const { EvernodeConstants } = require('./evernode-common');
const { TransactionHelper } = require('./transaction-helper');

// Utility helper functions.
class UtilHelpers {

    static decodeLeaseTokenUri(hexUri) {
        // Get the lease index from the token's URI.
        // <prefix><lease index 16)><half of tos hash><lease amount (int64)><identifier (uint32)>

        const asciiUri = TransactionHelper.hexToASCII(hexUri);
        const uriBuf = Buffer.from(asciiUri, 'base64');
        const prefixLen = EvernodeConstants.LEASE_TOKEN_PREFIX_HEX.length / 2;
        const halfToSLen = 16;
        return {
            leaseIndex: uriBuf.readUint16BE(prefixLen),
            halfTos: uriBuf.slice(prefixLen + 2, halfToSLen),
            leaseAmount: parseFloat(XflHelpers.toString(uriBuf.readBigInt64BE(prefixLen + 2 + halfToSLen))),
            identifier: uriBuf.length >= (prefixLen + 14 + halfToSLen) ? uriBuf.readUInt32BE(prefixLen + 10 + halfToSLen) : null
        }
    }

    static getCurrentUnixTime(format = "sec") {
        const time = Date.now();
        switch (format) {
            case "sec":
                return Math.floor(time / 1000);
            default:
                return time;
        }
    }
}

module.exports = {
    UtilHelpers
}
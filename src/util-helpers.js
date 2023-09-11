const { Buffer } = require('buffer');
const { XflHelpers } = require('./xfl-helpers');
const { EvernodeConstants } = require('./evernode-common');
const { TransactionHelper } = require('./transaction-helper');

// Utility helper functions.
class UtilHelpers {

    static decodeLeaseTokenUri(hexUri) {
        // Get the lease index from the token's URI.
        // <prefix><lease index 16)><half of tos hash><lease amount (int64)><identifier (uint32)><(ip numeric array)>

        const asciiUri = TransactionHelper.hexToASCII(hexUri);
        const uriBuf = Buffer.from(asciiUri, 'base64');
        // Lengths of sub sections.
        const prefixLen = EvernodeConstants.LEASE_TOKEN_PREFIX_HEX.length / 2;
        const indexLen = 2;
        const halfToSLen = 16;
        const leaseAmountLen = 8;
        const identifierLen = 4;
        const ipDataLen = 16;

        // Offsets of sub sections
        const halfTosHashOffset = prefixLen + indexLen;
        const leaseAmountOffset = prefixLen + indexLen + halfToSLen;
        const identifierOffset = prefixLen + indexLen + halfToSLen + leaseAmountLen;
        const ipDataOffset = prefixLen + indexLen + halfToSLen + leaseAmountLen + identifierLen;
        return {
            leaseIndex: uriBuf.readUint16BE(prefixLen),
            halfTos: uriBuf.slice(halfTosHashOffset, halfTosHashOffset + halfToSLen),
            leaseAmount: parseFloat(XflHelpers.toString(uriBuf.readBigInt64BE(leaseAmountOffset))),
            identifier: uriBuf.length > identifierOffset ? uriBuf.readUInt32BE(identifierOffset) : null,
            ipv6Address: uriBuf.length > ipDataOffset ? uriBuf.slice(ipDataOffset, ipDataOffset + ipDataLen).toString('hex').toUpperCase().replace(/(.{4})(?!$)/g, "$1:") : null
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
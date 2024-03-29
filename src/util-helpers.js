const kp = require('ripple-keypairs');
const { Buffer } = require('buffer');
const { XflHelpers } = require('./xfl-helpers');
const { EvernodeConstants } = require('./evernode-common');
const { TransactionHelper } = require('./transaction-helper');
const { EvernodeHelpers } = require('./evernode-helpers');

// Utility helper functions.
class UtilHelpers {

    static decodeLeaseTokenUri(hexUri) {
        // Get the lease index from the token's URI.
        // <prefix><version>lease index 16)><half of tos hash><lease amount (int64)><identifier (uint32)><(ip numeric array)>

        const asciiUri = TransactionHelper.hexToASCII(hexUri);
        const uriBuf = Buffer.from(asciiUri, 'base64');
        // Lengths of sub sections.
        const prefixLen = EvernodeConstants.LEASE_TOKEN_PREFIX_HEX.length / 2;
        const versionPrefixLen = EvernodeConstants.LEASE_TOKEN_VERSION_PREFIX_HEX.length / 2;
        const versionLen = versionPrefixLen + 2;
        const indexLen = 2;
        const halfToSLen = 16;
        const leaseAmountLen = 8;
        const identifierLen = 4;
        const ipDataLen = 17;

        const isVersionedURI = EvernodeHelpers.isValidURI(hexUri, `${EvernodeConstants.LEASE_TOKEN_PREFIX_HEX}${EvernodeConstants.LEASE_TOKEN_VERSION_PREFIX_HEX}`);

        // Offsets of sub sections
        const versionPrefixOffset = prefixLen + versionPrefixLen;
        const halfTosHashOffset = isVersionedURI ? (prefixLen + versionLen + indexLen) : (prefixLen + indexLen);
        const leaseAmountOffset = isVersionedURI ? (prefixLen + versionLen + indexLen + halfToSLen) : (prefixLen + indexLen + halfToSLen);
        const identifierOffset = isVersionedURI ? (prefixLen + versionLen + indexLen + halfToSLen + leaseAmountLen) : (prefixLen + indexLen + halfToSLen + leaseAmountLen);
        const ipDataOffset = isVersionedURI ? (prefixLen + versionLen + indexLen + halfToSLen + leaseAmountLen + identifierLen) : (prefixLen + indexLen + halfToSLen + leaseAmountLen + identifierLen);

        return {
            version: isVersionedURI ? `${uriBuf.slice(prefixLen, versionPrefixOffset).toString()}${uriBuf.readUint16BE(prefixLen + versionPrefixLen)}` : null,
            leaseIndex: isVersionedURI ? uriBuf.readUint16BE(prefixLen + versionLen) : uriBuf.readUint16BE(prefixLen),
            halfTos: uriBuf.slice(halfTosHashOffset, halfTosHashOffset + halfToSLen),
            leaseAmount: parseFloat(XflHelpers.toString(uriBuf.readBigInt64BE(leaseAmountOffset))),
            identifier: uriBuf.length > identifierOffset ? uriBuf.readUInt32BE(identifierOffset) : null,
            outboundIP: (uriBuf.length > ipDataOffset && (uriBuf.readUint8(ipDataOffset) == 6))
                ? { family: 6, address: uriBuf.slice(ipDataOffset + 1, ipDataOffset + 1 + ipDataLen).toString('hex').toUpperCase().replace(/(.{4})(?!$)/g, "$1:") }
                : null
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

    static deriveKeypair(secret) {
        return kp.deriveKeypair(secret);
    }

    static deriveAddress(publicKey) {
        return kp.deriveAddress(publicKey);
    }
}

module.exports = {
    UtilHelpers
}
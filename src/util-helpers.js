const { Buffer } = require('buffer');
const { XflHelpers } = require('./xfl-helpers');
const { EvernodeConstants } = require('./evernode-common');
const { sha512Half } = require('xrpl-binary-codec/dist/hashes');
const { codec } = require('ripple-address-codec');

// Utility helper functions.
class UtilHelpers {

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

    static decodeLeaseNftUri(hexUri) {
        // Get the lease index from the nft URI.
        // <prefix><lease index (uint16)><half of tos hash (16 bytes)><lease amount (uint32)>
        const prefixLen = EvernodeConstants.LEASE_NFT_PREFIX_HEX.length / 2;
        const halfToSLen = 16;
        const uriBuf = Buffer.from(hexUri, 'hex');
        return {
            leaseIndex: uriBuf.readUint16BE(prefixLen),
            halfTos: uriBuf.slice(prefixLen + 2, halfToSLen),
            leaseAmount: parseFloat(XflHelpers.toString(uriBuf.readBigInt64BE(prefixLen + 2 + halfToSLen)))
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
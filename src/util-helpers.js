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

    static getNewHookCandidateId(hashesBuf) {
        const idBuf = Buffer.alloc(32, 0);
        const prefixLen = EvernodeConstants.CandidateTypes.NewHook;
        Buffer.from(EvernodeConstants.CandidateTypes.NewHook).copy(idBuf);
        sha512Half(hashesBuf).copy(idBuf, prefixLen, prefixLen);
        return idBuf.toString('hex').toUpperCase();
    }

    static getPilotedModeCandidateId() {
        const idBuf = Buffer.alloc(32, 0);
        const prefixLen = EvernodeConstants.CandidateTypes.PilotedMode;
        Buffer.from(EvernodeConstants.CandidateTypes.PilotedMode).copy(idBuf);
        Buffer.from(EvernodeConstants.HOOK_NAMESPACE, 'hex').copy(idBuf, prefixLen, prefixLen);
        return idBuf.toString('hex').toUpperCase();
    }

    static getDudHostCandidateId(hostAddress) {
        const idBuf = Buffer.alloc(32, 0);
        Buffer.from(EvernodeConstants.CandidateTypes.DudHost).copy(idBuf);
        codec.decodeAccountID(hostAddress).copy(idBuf, 12);
        return idBuf.toString('hex').toUpperCase();
    }
}

module.exports = {
    UtilHelpers
}
const codec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { HookStateKeys } = require('./evernode-common');
const { XflHelpers } = require('./xfl-helpers');

const NFTOKEN_PREFIX = '00080000';

const HOST_TOKEN_ID_OFFSET = 0;
const HOST_TOKEN_OFFSET = 32;
const HOST_COUNTRY_CODE_OFFSET = 35;
const HOST_CPU_MICROSEC_OFFSET = 37;
const HOST_RAM_MB_OFFSET = 41;
const HOST_DISK_MB_OFFSET = 45;
const HOST_DESCRIPTION_OFFSET = 57;
const HOST_REG_LEDGER_OFFSET = 83;
const HOST_REG_FEE_OFFSET = 91;
const HOST_TOT_INS_COUNT_OFFSET = 99;
const HOST_ACT_INS_COUNT_OFFSET = 103;
const HOST_HEARTBEAT_LEDGER_IDX_OFFSET = 107;

class StateHelpers {
    static StateTypes = {
        TOKEN_ID: 'tokenId',
        HOST_ADDR: 'hostAddr',
        SIGLETON: 'singleton',
        CONFIGURATION: 'configuration'
    }

    static decodeHostAddressState(stateKeyBuf, stateDataBuf) {
        return {
            address: codec.encodeAccountID(stateKeyBuf.slice(12)),
            nfTokenId: stateDataBuf.slice(HOST_TOKEN_ID_OFFSET, HOST_TOKEN_OFFSET).toString('hex').toUpperCase(),
            token: stateDataBuf.slice(HOST_TOKEN_OFFSET, HOST_COUNTRY_CODE_OFFSET).toString(),
            countryCode: stateDataBuf.slice(HOST_COUNTRY_CODE_OFFSET, HOST_CPU_MICROSEC_OFFSET).toString(),
            cpuMicrosec: stateDataBuf.readUInt32BE(HOST_CPU_MICROSEC_OFFSET),
            ramMb: stateDataBuf.readUInt32BE(HOST_RAM_MB_OFFSET),
            diskMb: stateDataBuf.readUInt32BE(HOST_DISK_MB_OFFSET),
            description: stateDataBuf.slice(HOST_DESCRIPTION_OFFSET, HOST_REG_LEDGER_OFFSET).toString().replace(/\0/g, ''),
            registrationLedger: Number(stateDataBuf.readBigUInt64BE(HOST_REG_LEDGER_OFFSET)),
            registrationFee: Number(stateDataBuf.readBigUInt64BE(HOST_REG_FEE_OFFSET)),
            noOfTotalInstances: stateDataBuf.readUInt32BE(HOST_TOT_INS_COUNT_OFFSET),
            noOfActiveInstances: stateDataBuf.readUInt32BE(HOST_ACT_INS_COUNT_OFFSET),
            lastHeartbeatLedger: stateDataBuf.readUInt32BE(HOST_HEARTBEAT_LEDGER_IDX_OFFSET)
        }
    }

    static decodeStateData(stateKey, stateData) {
        const hexKey = stateKey.toString('hex').toUpperCase();
        if (Buffer.from(HookStateKeys.PREFIX_HOST_ADDR, 'hex').compare(stateKey, 0, 4) === 0) {
            return {
                type: this.StateTypes.HOST_ADDR,
                key: hexKey,
                ...this.decodeHostAddressState(stateKey, stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.PREFIX_HOST_TOKENID, 'hex').compare(stateKey, 0, 4) === 0) {
            return {
                type: this.StateTypes.TOKEN_ID,
                key: hexKey,
                nfTokenId: `${NFTOKEN_PREFIX}${stateKey.slice(4).toString('hex')}`.toUpperCase(),
                address: codec.encodeAccountID(stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.HOST_COUNT, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: stateData.readUInt32BE()
            }
        }
        else if (Buffer.from(HookStateKeys.MOMENT_BASE_IDX, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: Number(stateData.readBigInt64BE())
            }
        }
        else if (Buffer.from(HookStateKeys.HOST_REG_FEE, 'hex').compare(stateKey) === 0 || Buffer.from(HookStateKeys.MAX_REG, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: Number(stateData.readBigUInt64BE())
            }
        }
        else if (Buffer.from(HookStateKeys.EVR_ISSUER_ADDR, 'hex').compare(stateKey) === 0 || Buffer.from(HookStateKeys.FOUNDATION_ADDR, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: codec.encodeAccountID(stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.MOMENT_SIZE, 'hex').compare(stateKey) === 0 || Buffer.from(HookStateKeys.HOST_HEARTBEAT_FREQ, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: stateData.readUInt16BE()
            }
        }
        else if (Buffer.from(HookStateKeys.MINT_LIMIT, 'hex').compare(stateKey) === 0 || Buffer.from(HookStateKeys.FIXED_REG_FEE, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: Number(stateData.readBigUInt64BE())
            }
        }
        else if (Buffer.from(HookStateKeys.PURCHASER_TARGET_PRICE, 'hex').compare(stateKey) === 0) {
            const xfl = stateData.readBigInt64BE(0);
            const val = XflHelpers.toString(xfl);
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: val
            }
        }
        else
            throw { type: 'Validation Error', message: 'Invalid state key.' };
    }

    static decodeStateKey(stateKey) {
        const hexKey = stateKey.toString('hex').toUpperCase();
        if (Buffer.from(HookStateKeys.PREFIX_HOST_ADDR, 'hex').compare(stateKey, 0, 4) === 0) {
            return {
                key: hexKey,
                type: this.StateTypes.HOST_ADDR
            };
        }
        else if (Buffer.from(HookStateKeys.PREFIX_HOST_TOKENID, 'hex').compare(stateKey, 0, 4) === 0) {
            return {
                key: hexKey,
                type: this.StateTypes.TOKEN_ID
            };
        }
        else if (Buffer.from(HookStateKeys.HOST_COUNT, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MOMENT_BASE_IDX, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HOST_REG_FEE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MAX_REG, 'hex').compare(stateKey) === 0) {
            return {
                key: hexKey,
                type: this.STATE_TYPES.SIGLETON
            };
        }
        else if (Buffer.from(HookStateKeys.EVR_ISSUER_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.FOUNDATION_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MOMENT_SIZE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HOST_HEARTBEAT_FREQ, 'hex').compare(stateKey) ||
            Buffer.from(HookStateKeys.MINT_LIMIT, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.FIXED_REG_FEE, 'hex').compare(stateKey) === 0) {
            return {
                key: hexKey,
                type: this.STATE_TYPES.CONFIGURATION
            };
        }
        else
            throw { type: 'Validation Error', message: 'Invalid state key.' };
    }
}

module.exports = {
    StateHelpers
}
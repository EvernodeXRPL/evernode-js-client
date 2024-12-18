const codec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { HookStateKeys, EvernodeConstants } = require('./evernode-common');
const { XflHelpers } = require('./xfl-helpers');
const crypto = require("crypto");
const { sha512Half } = require('xrpl-binary-codec/dist/hashes');

const EPOCH_OFFSET = 0;
const SAVED_MOMENT_OFFSET = 1;
const PREV_MOMENT_ACTIVE_HOST_COUNT_OFFSET = 5;
const CUR_MOMENT_ACTIVE_HOST_COUNT_OFFSET = 9;
const EPOCH_POOL_OFFSET = 13;
const HOST_MAX_LEASE_AMOUNT_OFFSET = 21;

const EPOCH_COUNT_OFFSET = 0;
const FIRST_EPOCH_REWARD_QUOTA_OFFSET = 1;
const EPOCH_REWARD_AMOUNT_OFFSET = 5;
const REWARD_START_MOMENT_OFFSET = 9;
const ACCUMULATED_REWARD_FREQUENCY_OFFSET = 13;
const HOST_REPUTATION_THRESHOLD_OFFSET = 15;
const HOST_MIN_INSTANCE_COUNT_OFFSET = 16;

const TRANSIT_IDX_OFFSET = 0;
const TRANSIT_MOMENT_SIZE_OFFSET = 8;
const TRANSIT_MOMENT_TYPE_OFFSET = 10;

const MOMENT_BASE_POINT_OFFSET = 0;
const MOMENT_AT_TRANSITION_OFFSET = 8;
const MOMENT_TYPE_OFFSET = 12;

const ELIGIBILITY_PERIOD_OFFSET = 0;
const CANDIDATE_LIFE_PERIOD_OFFSET = 4;
const CANDIDATE_ELECTION_PERIOD_OFFSET = 8;
const CANDIDATE_SUPPORT_AVERAGE_OFFSET = 12;

const GOVERNANCE_MODE_OFFSET = 0;
const LAST_CANDIDATE_IDX_OFFSET = 1;
const VOTER_BASE_COUNT_OFFSET = 5;
const VOTER_BASE_COUNT_CHANGED_TIMESTAMP_OFFSET = 9;
const FOUNDATION_LAST_VOTED_CANDIDATE_IDX = 17;
const FOUNDATION_LAST_VOTED_TIMESTAMP_OFFSET = 21;
const ELECTED_PROPOSAL_UNIQUE_ID_OFFSET = 29;
const PROPOSAL_ELECTED_TIMESTAMP_OFFSET = 61;
const UPDATED_HOOK_COUNT_OFFSET = 69;
const PREV_MOMENT_VOTER_BASE_COUNT_OFFSET = 70;

const FEE_BASE_AVG_OFFSET = 0;
const FEE_BASE_AVG_CHANGED_IDX_OFFSET = 4;
const FEE_BASE_AVG_ACCUMULATOR_OFFSET = 12;
const FEE_BASE_COUNTER_OFFSET = 16;

const HOST_TOKEN_ID_OFFSET = 0;
const HOST_COUNTRY_CODE_OFFSET = 32;
const HOST_RESERVED_OFFSET = 34;
const HOST_DESCRIPTION_OFFSET = 42;
const HOST_REG_LEDGER_OFFSET = 68;
const HOST_REG_FEE_OFFSET = 76;
const HOST_TOT_INS_COUNT_OFFSET = 84;
const HOST_ACT_INS_COUNT_OFFSET = 88;
const HOST_HEARTBEAT_TIMESTAMP_OFFSET = 92;
const HOST_VERSION_OFFSET = 100;
const HOST_REG_TIMESTAMP_OFFSET = 103;
const HOST_TRANSFER_FLAG_OFFSET = 111;
const HOST_LAST_VOTE_CANDIDATE_IDX_OFFSET = 112;
const HOST_LAST_VOTE_TIMESTAMP_OFFSET = 116;
const HOST_SUPPORT_VOTE_FLAG_OFFSET = 124;
const HOST_REPUTATION_OFFSET = 125;
const HOST_FLAGS_OFFSET = 126;
const HOST_TRANSFER_TIMESTAMP_OFFSET = 127;
const HOST_LEASE_AMOUNT_OFFSET = 135;

const HOST_ADDRESS_OFFSET = 0;
const HOST_CPU_MODEL_NAME_OFFSET = 20;
const HOST_CPU_COUNT_OFFSET = 60;
const HOST_CPU_SPEED_OFFSET = 62;
const HOST_CPU_MICROSEC_OFFSET = 64;
const HOST_RAM_MB_OFFSET = 68;
const HOST_DISK_MB_OFFSET = 72;
const HOST_EMAIL_ADDRESS_OFFSET = 76;
const HOST_ACCUMULATED_REWARD_OFFSET = 116;

const HOST_REP_LAST_REG_MOMENT_OFFSET = 0;
const HOST_REP_SCORE_NUMERATOR_OFFSET = 8;
const HOST_REP_SCORE_DENOMINATOR_OFFSET = 16;
const HOST_REP_SCORE_OFFSET = 24;
const HOST_REP_LAST_RESET_MOMENT_OFFSET = 32;
const HOST_REP_LAST_SCORED_MOMENT_OFFSET = 40;
const HOST_REP_LAST_UNIVERSE_SIZE_OFFSET = 48;

const PREV_HOST_ADDRESS_OFFSET = 0;
const TRANSFER_LEDGER_IDX_OFFSET = 20;
const TRANSFERRED_NFT_ID_OFFSET = 28;

const CANDIDATE_GOVERNOR_HOOK_HASH_OFFSET = 0;
const CANDIDATE_REGISTRY_HOOK_HASH_OFFSET = 32;
const CANDIDATE_HEARTBEAT_HOOK_HASH_OFFSET = 64;
const CANDIDATE_REPUTATION_HOOK_HASH_OFFSET = 96;

const CANDIDATE_OWNER_ADDRESS_OFFSET = 0;
const CANDIDATE_IDX_OFFSET = 20;
const CANDIDATE_SHORT_NAME_OFFSET = 24;
const CANDIDATE_CREATED_TIMESTAMP_OFFSET = 44;
const CANDIDATE_PROPOSAL_FEE_OFFSET = 52;
const CANDIDATE_POSITIVE_VOTE_COUNT_OFFSET = 60;
const CANDIDATE_LAST_VOTE_TIMESTAMP_OFFSET = 64;
const CANDIDATE_STATUS_OFFSET = 72;
const CANDIDATE_STATUS_CHANGE_TIMESTAMP_OFFSET = 73;
const CANDIDATE_FOUNDATION_VOTE_STATUS_OFFSET = 81;
const CANDIDATE_ELECT_PURGE_LAST_TRY_TIMESTAMP_OFFSET = 82;
const CANDIDATE_COMPLETE_ACKNOWLEDGED_OFFSET = 90;

const NETWORK_BUSYNESS_DETECT_PERIOD_OFFSET = 0;
const NETWORK_BUSYNESS_DETECT_AVERAGE_OFFSET = 4;

const STATE_KEY_TYPES = {
    // Governor hook.
    TOKEN_ID: 2,
    HOST_ADDR: 3,
    TRANSFEREE_ADDR: 4,
    CANDIDATE_OWNER: 5,
    CANDIDATE_ID: 6,

    // Host reputation hook.
    REPUTATION_CONTRACT_INFO: 2,
}

const MOMENT_TYPES = {
    LEDGER: 0,
    TIMESTAMP: 1
}

const TRANSFER_STATES = {
    NO_TRANSFER: 0,
    HAS_A_TRANSFER: 1
}

const HOST_FLAGS = {
    REPUTED_ON_HEARTBEAT: 1
}

const EVERNODE_PREFIX = 'EVR';
const HOST_ADDR_KEY_ZERO_COUNT = 8;
const TRANSFEREE_ADDR_KEY_ZERO_COUNT = 8;
const CANDIDATE_OWNER_KEY_ZERO_COUNT = 8;
const HOOK_STATE_LEDGER_TYPE_PREFIX = 118; // Decimal value of ASCII 'v'
const PENDING_TRANSFER = 1;
const HOST_EMAIL_ADDRESS_LEN = 40;
const STATE_KEY_SIZE = 32;
const ACCOUNT_ID_SIZE = 20;

/**
 * Provides various utility functions for working with States.
 */
class StateHelpers {
    static StateTypes = {
        TOKEN_ID: 'tokenId',
        HOST_ADDR: 'hostAddr',
        SIGLETON: 'singleton',
        CONFIGURATION: 'configuration',
        TRANSFEREE_ADDR: 'transfereeAddr',
        CANDIDATE_OWNER: 'candidateOwner',
        CANDIDATE_ID: 'candidateId'
    }

    static timeLines = {
        SEC: "SEC"
    }

    /**
     * Retrieves the state data for a specific key from an array of states.
     * @param {Array} states - Array of state objects.
     * @param {string} key - Key for the state data.
     * @returns {Object|null} The state data or null if not found.
     */
    static getStateData(states, key) {
        const state = states.find(s => key === s.key);
        if (!state)
            return null;

        return state.data;
    }

    /**
     * Decodes reputation host address state from buffers.
     * @param {Buffer} stateKeyBuf - Buffer containing the state key.
     * @param {Buffer} stateDataBuf - Buffer containing the state data.
     * @returns {Object} Decoded state data including host address and reputation metrics.
     */
    static decodeReputationHostAddressState(stateKeyBuf, stateDataBuf) {
        const keyOffset = STATE_KEY_SIZE - ACCOUNT_ID_SIZE;
        const data = {
            hostAddress: codec.encodeAccountID(stateKeyBuf.slice(keyOffset)),
            lastRegisteredMoment: Number(stateDataBuf.readBigUInt64LE(HOST_REP_LAST_REG_MOMENT_OFFSET)),
            scoreNumerator: Number(stateDataBuf.readBigUInt64LE(HOST_REP_SCORE_NUMERATOR_OFFSET)),
            scoreDenominator: Number(stateDataBuf.readBigUInt64LE(HOST_REP_SCORE_DENOMINATOR_OFFSET)),
            score: stateDataBuf.length > HOST_REP_SCORE_OFFSET ? Number(stateDataBuf.readBigUInt64LE(HOST_REP_SCORE_OFFSET)) : null,
            lastResetMoment: stateDataBuf.length > HOST_REP_LAST_RESET_MOMENT_OFFSET ? Number(stateDataBuf.readBigUInt64LE(HOST_REP_LAST_RESET_MOMENT_OFFSET)) : null,
            lastScoredMoment: stateDataBuf.length > HOST_REP_LAST_SCORED_MOMENT_OFFSET ? Number(stateDataBuf.readBigUInt64LE(HOST_REP_LAST_SCORED_MOMENT_OFFSET)) : null,
            lastUniverseSize: stateDataBuf.length > HOST_REP_LAST_UNIVERSE_SIZE_OFFSET ? Number(stateDataBuf.readBigUInt64LE(HOST_REP_LAST_UNIVERSE_SIZE_OFFSET)) : null,
        }
        return data;
    }

    /**
     * Decodes reputation host order address state from buffers.
     * @param {Buffer} stateKeyBuf - Buffer containing the state key.
     * @param {Buffer} stateDataBuf - Buffer containing the state data.
     * @returns {Object} Decoded state data including moment and ordered ID.
     */
    static decodeReputationHostOrderAddressState(stateKeyBuf, stateDataBuf) {
        const keyOffset = STATE_KEY_SIZE - ACCOUNT_ID_SIZE - 8;
        const data = {
            moment: Number(stateKeyBuf.readBigUInt64LE(keyOffset)),
            hostAddress: codec.encodeAccountID(stateKeyBuf.slice(keyOffset + 8)),
            orderedId: Number(stateDataBuf.readBigUInt64LE(0))
        }
        return data;
    }

    /**
     * Decodes reputation host ordered ID state from buffers.
     * @param {Buffer} stateKeyBuf - Buffer containing the state key.
     * @param {Buffer} stateDataBuf - Buffer containing the state data.
     * @returns {Object} Decoded state data including moment and ordered ID.
     */
    static decodeReputationHostOrderedIdState(stateKeyBuf, stateDataBuf) {
        const keyOffset = STATE_KEY_SIZE - 16;
        const data = {
            moment: Number(stateKeyBuf.readBigUInt64LE(keyOffset)),
            orderedId: Number(stateKeyBuf.readBigUInt64LE(keyOffset + 8)),
            hostAddress: codec.encodeAccountID(stateDataBuf.slice(0))
        }
        return data;
    }

    /**
     * Decodes reputation host count state from buffers.
     * @param {Buffer} stateKeyBuf - Buffer containing the state key.
     * @param {Buffer} stateDataBuf - Buffer containing the state data.
     * @returns {Object} Decoded state data including moment and count.
     */
    static decodeReputationHostCountState(stateKeyBuf, stateDataBuf) {
        const keyOffset = STATE_KEY_SIZE - 8;
        const data = {
            moment: Number(stateKeyBuf.readBigUInt64LE(keyOffset)),
            count: Number(stateDataBuf.readBigUInt64LE())
        }
        return data;
    }

    /**
     * Decodes a host address state from buffers.
     * @param {Buffer} stateKeyBuf - The buffer containing the state key.
     * @param {Buffer} stateDataBuf - The buffer containing the state data.
     * @returns {Object} The decoded host address state.
     */
    static decodeHostAddressState(stateKeyBuf, stateDataBuf) {
        let data = {
            address: codec.encodeAccountID(stateKeyBuf.slice(12)),
            uriTokenId: stateDataBuf.slice(HOST_TOKEN_ID_OFFSET, HOST_COUNTRY_CODE_OFFSET).toString('hex').toUpperCase(),
            countryCode: stateDataBuf.slice(HOST_COUNTRY_CODE_OFFSET, HOST_RESERVED_OFFSET).toString(),
            description: stateDataBuf.slice(HOST_DESCRIPTION_OFFSET, HOST_REG_LEDGER_OFFSET).toString().replace(/\0/g, ''),
            registrationLedger: Number(stateDataBuf.readBigUInt64LE(HOST_REG_LEDGER_OFFSET)),
            registrationFee: Number(stateDataBuf.readBigUInt64LE(HOST_REG_FEE_OFFSET)),
            maxInstances: stateDataBuf.readUInt32LE(HOST_TOT_INS_COUNT_OFFSET),
            activeInstances: stateDataBuf.readUInt32LE(HOST_ACT_INS_COUNT_OFFSET),
            lastHeartbeatIndex: Number(stateDataBuf.readBigUInt64LE(HOST_HEARTBEAT_TIMESTAMP_OFFSET)),
            version: `${stateDataBuf.readUInt8(HOST_VERSION_OFFSET)}.${stateDataBuf.readUInt8(HOST_VERSION_OFFSET + 1)}.${stateDataBuf.readUInt8(HOST_VERSION_OFFSET + 2)}`,
            isATransferer: (stateDataBuf.readUInt8(HOST_TRANSFER_FLAG_OFFSET) === PENDING_TRANSFER) ? TRANSFER_STATES.HAS_A_TRANSFER : TRANSFER_STATES.NO_TRANSFER,
            lastVoteCandidateIdx: stateDataBuf.readUInt32LE(HOST_LAST_VOTE_CANDIDATE_IDX_OFFSET),
            lastVoteTimestamp: Number(stateDataBuf.readBigUInt64LE(HOST_LAST_VOTE_TIMESTAMP_OFFSET)),
            supportVoteSent: stateDataBuf.readUInt8(HOST_SUPPORT_VOTE_FLAG_OFFSET)
        }
        if (stateDataBuf.length > HOST_REG_TIMESTAMP_OFFSET)
            data.registrationTimestamp = Number(stateDataBuf.readBigUInt64LE(HOST_REG_TIMESTAMP_OFFSET));
        if (stateDataBuf.length > HOST_REPUTATION_OFFSET)
            data.hostReputation = stateDataBuf.readUInt8(HOST_REPUTATION_OFFSET);
        if (stateDataBuf.length > HOST_FLAGS_OFFSET) {
            const flags = stateDataBuf.readUInt8(HOST_FLAGS_OFFSET);
            data.reputedOnHeartbeat = !!(flags & HOST_FLAGS.REPUTED_ON_HEARTBEAT);
        }
        if (stateDataBuf.length > HOST_TRANSFER_TIMESTAMP_OFFSET)
            data.transferTimestamp = Number(stateDataBuf.readBigUInt64LE(HOST_TRANSFER_TIMESTAMP_OFFSET));
        if (stateDataBuf.length > HOST_LEASE_AMOUNT_OFFSET)
            data.leaseAmount = XflHelpers.toString(stateDataBuf.readBigInt64LE(HOST_LEASE_AMOUNT_OFFSET));
        return data;
    }

    /**
     * Decodes a token ID state from a buffer.
     * @param {Buffer} stateDataBuf - The buffer containing the state data.
     * @returns {Object} The decoded token ID state.
     */
    static decodeTokenIdState(stateDataBuf) {
        return {
            address: codec.encodeAccountID(stateDataBuf.slice(HOST_ADDRESS_OFFSET, HOST_CPU_MODEL_NAME_OFFSET)),
            cpuModelName: stateDataBuf.slice(HOST_CPU_MODEL_NAME_OFFSET, HOST_CPU_COUNT_OFFSET).toString().replace(/\x00+$/, ''), // Remove trailing \x00 characters.
            cpuCount: stateDataBuf.readUInt16LE(HOST_CPU_COUNT_OFFSET),
            cpuMHz: stateDataBuf.readUInt16LE(HOST_CPU_SPEED_OFFSET),
            cpuMicrosec: stateDataBuf.readUInt32LE(HOST_CPU_MICROSEC_OFFSET),
            ramMb: stateDataBuf.readUInt32LE(HOST_RAM_MB_OFFSET),
            diskMb: stateDataBuf.readUInt32LE(HOST_DISK_MB_OFFSET),
            email: stateDataBuf.slice(HOST_EMAIL_ADDRESS_OFFSET, HOST_EMAIL_ADDRESS_OFFSET + HOST_EMAIL_ADDRESS_LEN).toString().toString().replace(/\0/g, ''),
            accumulatedRewardAmount: XflHelpers.toString(stateDataBuf.readBigInt64LE(HOST_ACCUMULATED_REWARD_OFFSET))
        }
    }

    /**
     * Decodes a transferee address state from buffers.
     * @param {Buffer} stateKeyBuf - The buffer containing the state key.
     * @param {Buffer} stateDataBuf - The buffer containing the state data.
     * @returns {Object} The decoded transferee address state.
     */
    static decodeTransfereeAddrState(stateKeyBuf, stateDataBuf) {
        const prevHostClassicAddress = codec.encodeAccountID(stateDataBuf.slice(PREV_HOST_ADDRESS_OFFSET, TRANSFER_LEDGER_IDX_OFFSET));
        return {
            futureOwnerAddress: codec.encodeAccountID(stateKeyBuf.slice(12)),
            prevHostAddressKey: this.generateHostAddrStateKey(prevHostClassicAddress),
            prevHostAddress: prevHostClassicAddress,
            transferLedgerIdx: Number(stateDataBuf.readBigUInt64LE(TRANSFER_LEDGER_IDX_OFFSET)),
            transferredNfTokenId: stateDataBuf.slice(TRANSFERRED_NFT_ID_OFFSET, 60).toString('hex').toUpperCase()
        }
    }

    /**
     * Decodes a candidate owner state from buffers.
     * @param {Buffer} stateKeyBuf - The buffer containing the state key.
     * @param {Buffer} stateDataBuf - The buffer containing the state data.
     * @returns {Object} The decoded candidate owner state.
     */
    static decodeCandidateOwnerState(stateKeyBuf, stateDataBuf) {
        let data = {
            ownerAddress: codec.encodeAccountID(stateKeyBuf.slice(12)),
            uniqueId: this.getNewHookCandidateId(stateDataBuf),
            governorHookHash: stateDataBuf.slice(CANDIDATE_GOVERNOR_HOOK_HASH_OFFSET, CANDIDATE_REGISTRY_HOOK_HASH_OFFSET).toString('hex').toUpperCase(),
            registryHookHash: stateDataBuf.slice(CANDIDATE_REGISTRY_HOOK_HASH_OFFSET, CANDIDATE_HEARTBEAT_HOOK_HASH_OFFSET).toString('hex').toUpperCase(),
            heartbeatHookHash: stateDataBuf.slice(CANDIDATE_HEARTBEAT_HOOK_HASH_OFFSET, CANDIDATE_HEARTBEAT_HOOK_HASH_OFFSET + 32).toString('hex').toUpperCase(),
            reputationHookHash: stateDataBuf.slice(CANDIDATE_REPUTATION_HOOK_HASH_OFFSET, CANDIDATE_REPUTATION_HOOK_HASH_OFFSET + 32).toString('hex').toUpperCase(),

        }
        return data;
    }

    /**
     * Decodes a candidate ID state from a buffer.
     * @param {Buffer} stateDataBuf - The buffer containing the state data.
     * @returns {Object} The decoded candidate ID state.
     */
    static decodeCandidateIdState(stateDataBuf) {
        let status = '';
        switch (stateDataBuf.readUInt8(CANDIDATE_STATUS_OFFSET)) {
            case EvernodeConstants.CandidateStatuses.CANDIDATE_SUPPORTED:
                status = 'supported';
                break;
            case EvernodeConstants.CandidateStatuses.CANDIDATE_ELECTED:
                status = 'elected';
                break;
            case EvernodeConstants.CandidateStatuses.CANDIDATE_PURGED:
                status = 'purged';
                break;
            case EvernodeConstants.CandidateStatuses.CANDIDATE_WITHDRAWN:
                status = 'withdrawn';
                break;
            default:
                status = 'rejected';
                break;
        }

        let data = {
            ownerAddress: codec.encodeAccountID(stateDataBuf.slice(CANDIDATE_OWNER_ADDRESS_OFFSET, CANDIDATE_IDX_OFFSET)),
            index: stateDataBuf.readUInt32LE(CANDIDATE_IDX_OFFSET),
            shortName: stateDataBuf.slice(CANDIDATE_SHORT_NAME_OFFSET, CANDIDATE_CREATED_TIMESTAMP_OFFSET).toString().replace(/\x00+$/, ''), // Remove trailing \x00 characters.
            createdTimestamp: Number(stateDataBuf.readBigUInt64LE(CANDIDATE_CREATED_TIMESTAMP_OFFSET)),
            proposalFee: XflHelpers.toString(stateDataBuf.readBigInt64LE(CANDIDATE_PROPOSAL_FEE_OFFSET)),
            positiveVoteCount: stateDataBuf.readUInt32LE(CANDIDATE_POSITIVE_VOTE_COUNT_OFFSET),
            lastVoteTimestamp: Number(stateDataBuf.readBigUInt64LE(CANDIDATE_LAST_VOTE_TIMESTAMP_OFFSET)),
            status: status,
            statusChangeTimestamp: Number(stateDataBuf.readBigUInt64LE(CANDIDATE_STATUS_CHANGE_TIMESTAMP_OFFSET)),
            foundationVoteStatus: stateDataBuf.readUInt8(CANDIDATE_FOUNDATION_VOTE_STATUS_OFFSET) === EvernodeConstants.CandidateStatuses.CANDIDATE_SUPPORTED ? 'supported' : 'rejected',
        }
        if (stateDataBuf.length > CANDIDATE_ELECT_PURGE_LAST_TRY_TIMESTAMP_OFFSET)
            data.electPurgeLastTryTimestamp = Number(stateDataBuf.readBigUInt64LE(CANDIDATE_ELECT_PURGE_LAST_TRY_TIMESTAMP_OFFSET));
        if (stateDataBuf.length > CANDIDATE_COMPLETE_ACKNOWLEDGED_OFFSET)
            data.completeAcknowledged = !!(stateDataBuf.readUInt8(CANDIDATE_COMPLETE_ACKNOWLEDGED_OFFSET));
        return data;
    }

    /**
     * Decodes state data based on the state key and state data buffers.
     * @param {Buffer} stateKey - The buffer containing the state key.
     * @param {Buffer} stateData - The buffer containing the state data.
     * @returns {Object} The decoded state data with type information.
     */
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
            // Generate the address state key.
            const addressKeyBuf = Buffer.alloc(32, 0);
            Buffer.from(HookStateKeys.PREFIX_HOST_ADDR, 'hex').copy(addressKeyBuf);
            stateData.copy(addressKeyBuf, 12, HOST_ADDRESS_OFFSET, HOST_CPU_MODEL_NAME_OFFSET)
            return {
                type: this.StateTypes.TOKEN_ID,
                key: hexKey,
                addressKey: addressKeyBuf.toString('hex').toUpperCase(),
                ...this.decodeTokenIdState(stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.PREFIX_TRANSFEREE_ADDR, 'hex').compare(stateKey, 0, 4) === 0) {
            return {
                type: this.StateTypes.TRANSFEREE_ADDR,
                key: hexKey,
                ...this.decodeTransfereeAddrState(stateKey, stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.PREFIX_CANDIDATE_OWNER, 'hex').compare(stateKey, 0, 4) === 0) {
            const decoded = this.decodeCandidateOwnerState(stateKey, stateData);

            // Generate the address state key.
            const idBuf = Buffer.alloc(32, 0);
            Buffer.from(HookStateKeys.PREFIX_CANDIDATE_ID, 'hex').copy(idBuf);
            Buffer.from(decoded.uniqueId, 'hex').copy(idBuf, 4, 4, 32)

            return {
                type: this.StateTypes.CANDIDATE_OWNER,
                key: hexKey,
                idKey: idBuf.toString('hex').toUpperCase(),
                ...decoded
            }
        }
        else if (Buffer.from(HookStateKeys.PREFIX_CANDIDATE_ID, 'hex').compare(stateKey, 0, 4) === 0) {
            // Generate the owner state key.
            const candidateData = {
                type: this.StateTypes.CANDIDATE_ID,
                key: hexKey
            };

            const uniqueIdBuf = Buffer.alloc(32, 0);
            stateKey.copy(uniqueIdBuf, 4, 4, 32);
            candidateData.uniqueId = uniqueIdBuf.toString('hex').toUpperCase();

            const candidateType = stateKey.readUInt8(4);
            if (EvernodeConstants.CandidateTypes.DudHost === candidateType)
                candidateData.dudHostAddress = codec.encodeAccountID(stateKey.slice(12, 32));

            return {
                ...candidateData,
                ...this.decodeCandidateIdState(stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.HOST_COUNT, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: stateData.readUInt32LE()
            }
        }
        else if (Buffer.from(HookStateKeys.MOMENT_BASE_INFO, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: {
                    baseIdx: Number(stateData.readBigUInt64LE(MOMENT_BASE_POINT_OFFSET)),
                    baseTransitionMoment: stateData.length > MOMENT_AT_TRANSITION_OFFSET ? stateData.readUInt32LE(MOMENT_AT_TRANSITION_OFFSET) : 0,
                    momentType: (stateData.length <= MOMENT_TYPE_OFFSET || stateData.readUInt8(MOMENT_TYPE_OFFSET) === MOMENT_TYPES.LEDGER) ? 'ledger' : 'timestamp'
                }
            }
        }
        else if (Buffer.from(HookStateKeys.HOST_REG_FEE, 'hex').compare(stateKey) === 0 || Buffer.from(HookStateKeys.MAX_REG, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: Number(stateData.readBigUInt64LE())
            }
        }
        else if (Buffer.from(HookStateKeys.REGISTRY_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HEARTBEAT_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.EVR_ISSUER_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.FOUNDATION_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.REPUTATION_ADDR, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: codec.encodeAccountID(stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.MOMENT_SIZE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HOST_HEARTBEAT_FREQ, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.LEASE_ACQUIRE_WINDOW, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: stateData.readUInt16LE()
            }
        }
        else if (Buffer.from(HookStateKeys.MINT_LIMIT, 'hex').compare(stateKey) === 0 || Buffer.from(HookStateKeys.FIXED_REG_FEE, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: Number(stateData.readBigUInt64LE())
            }
        }
        else if (Buffer.from(HookStateKeys.REWARD_CONFIGURATION, 'hex').compare(stateKey) === 0) {
            let value = {
                epochCount: stateData.readUInt8(EPOCH_COUNT_OFFSET),
                firstEpochRewardQuota: stateData.readUInt32LE(FIRST_EPOCH_REWARD_QUOTA_OFFSET),
                epochRewardAmount: stateData.readUInt32LE(EPOCH_REWARD_AMOUNT_OFFSET),
                rewardStartMoment: stateData.readUInt32LE(REWARD_START_MOMENT_OFFSET),
                accumulatedRewardFrequency: stateData.readUInt16LE(ACCUMULATED_REWARD_FREQUENCY_OFFSET)
            };
            if (stateData.length > HOST_REPUTATION_THRESHOLD_OFFSET)
                value.hostReputationThreshold = stateData.readUInt8(HOST_REPUTATION_THRESHOLD_OFFSET);
            if (stateData.length > HOST_MIN_INSTANCE_COUNT_OFFSET)
                value.hostMinInstanceCount = stateData.readUInt32LE(HOST_MIN_INSTANCE_COUNT_OFFSET);
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: value
            }
        }
        else if (Buffer.from(HookStateKeys.REWARD_INFO, 'hex').compare(stateKey) === 0) {
            let value = {
                epoch: stateData.readUInt8(EPOCH_OFFSET),
                savedMoment: stateData.readUInt32LE(SAVED_MOMENT_OFFSET),
                prevMomentActiveHostCount: stateData.readUInt32LE(PREV_MOMENT_ACTIVE_HOST_COUNT_OFFSET),
                curMomentActiveHostCount: stateData.readUInt32LE(CUR_MOMENT_ACTIVE_HOST_COUNT_OFFSET),
                epochPool: XflHelpers.toString(stateData.readBigInt64LE(EPOCH_POOL_OFFSET)),
            };
            if (stateData.length > HOST_MAX_LEASE_AMOUNT_OFFSET)
                value.hostMaxLeaseAmount = XflHelpers.toString(stateData.readBigInt64LE(HOST_MAX_LEASE_AMOUNT_OFFSET));
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: value
            }
        }
        else if (Buffer.from(HookStateKeys.MAX_TOLERABLE_DOWNTIME, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: stateData.readUInt16LE()
            }
        }
        else if (Buffer.from(HookStateKeys.MOMENT_TRANSIT_INFO, 'hex').compare(stateKey) === 0) {
            Buffer.alloc(1).readUInt8()
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: {
                    transitionIndex: Number(stateData.readBigInt64LE(TRANSIT_IDX_OFFSET)),
                    momentSize: stateData.readUInt16LE(TRANSIT_MOMENT_SIZE_OFFSET),
                    momentType: stateData.readUInt8(TRANSIT_MOMENT_TYPE_OFFSET) === MOMENT_TYPES.LEDGER ? 'ledger' : 'timestamp'
                }
            }
        }
        else if (Buffer.from(HookStateKeys.MAX_TRX_EMISSION_FEE, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: Number(stateData.readBigUInt64LE())
            }
        }
        else if (Buffer.from(HookStateKeys.GOVERNANCE_CONFIGURATION, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: {
                    eligibilityPeriod: stateData.readUInt32LE(ELIGIBILITY_PERIOD_OFFSET),
                    candidateLifePeriod: stateData.readUInt32LE(CANDIDATE_LIFE_PERIOD_OFFSET),
                    candidateElectionPeriod: stateData.readUInt32LE(CANDIDATE_ELECTION_PERIOD_OFFSET),
                    candidateSupportAverage: stateData.readUInt16LE(CANDIDATE_SUPPORT_AVERAGE_OFFSET)
                }
            }
        }
        else if (Buffer.from(HookStateKeys.GOVERNANCE_INFO, 'hex').compare(stateKey) === 0) {
            let mode = '';
            switch (stateData.readUInt8(GOVERNANCE_MODE_OFFSET)) {
                case EvernodeConstants.GovernanceModes.Piloted:
                    mode = 'piloted';
                    break;
                case EvernodeConstants.GovernanceModes.CoPiloted:
                    mode = 'co-piloted';
                    break;
                case EvernodeConstants.GovernanceModes.AutoPiloted:
                    mode = 'auto-piloted';
                    break;
                default:
                    mode = 'undefined';
                    break;
            }
            let value = {
                governanceMode: mode,
                lastCandidateIdx: stateData.readUInt32LE(LAST_CANDIDATE_IDX_OFFSET),
                voteBaseCount: stateData.readUInt32LE(VOTER_BASE_COUNT_OFFSET),
                voteBaseCountChangedTimestamp: Number(stateData.readBigUInt64LE(VOTER_BASE_COUNT_CHANGED_TIMESTAMP_OFFSET)),
                foundationLastVotedCandidateIdx: stateData.readUInt32LE(FOUNDATION_LAST_VOTED_CANDIDATE_IDX),
                foundationLastVotedTimestamp: Number(stateData.readBigUInt64LE(FOUNDATION_LAST_VOTED_TIMESTAMP_OFFSET)),
                electedProposalUniqueId: stateData.slice(ELECTED_PROPOSAL_UNIQUE_ID_OFFSET, PROPOSAL_ELECTED_TIMESTAMP_OFFSET).toString('hex').toUpperCase(),
                proposalElectedTimestamp: Number(stateData.readBigUInt64LE(PROPOSAL_ELECTED_TIMESTAMP_OFFSET)),
                updatedHookCount: stateData.readUInt8(UPDATED_HOOK_COUNT_OFFSET),
            };
            if (stateData.length > PREV_MOMENT_VOTER_BASE_COUNT_OFFSET)
                value.prevMomentVoteBaseCount = stateData.readUInt32LE(PREV_MOMENT_VOTER_BASE_COUNT_OFFSET);
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: value
            }
        }
        else if (Buffer.from(HookStateKeys.NETWORK_CONFIGURATION, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: {
                    busynessDetectPeriod: stateData.readUInt32LE(NETWORK_BUSYNESS_DETECT_PERIOD_OFFSET),
                    busynessDetectAverage: stateData.readUInt16LE(NETWORK_BUSYNESS_DETECT_AVERAGE_OFFSET)
                }
            }
        }
        else if (Buffer.from(HookStateKeys.TRX_FEE_BASE_INFO, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: {
                    feeBaseAvg: stateData.readUInt32LE(FEE_BASE_AVG_OFFSET),
                    avgChangedIdx: Number(stateData.readBigUInt64LE(FEE_BASE_AVG_CHANGED_IDX_OFFSET)),
                    avgAccumulator: stateData.readUInt32LE(FEE_BASE_AVG_ACCUMULATOR_OFFSET),
                    counter: stateData.readUInt16LE(FEE_BASE_COUNTER_OFFSET)
                }
            }
        }
        else
            throw { type: 'Validation Error', message: 'Invalid state key.' };
    }

    /**
     * Decodes a state key into a type and key.
     * @param {Buffer} stateKey - The buffer containing the state key.
     * @returns {Object} An object containing the key as a hexadecimal string and its type.
     * @throws {Object} Throws a Validation Error if the state key is invalid.
     */
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
        else if (Buffer.from(HookStateKeys.PREFIX_TRANSFEREE_ADDR, 'hex').compare(stateKey, 0, 4) === 0) {
            return {
                key: hexKey,
                type: this.StateTypes.TRANSFEREE_ADDR
            };
        }
        else if (Buffer.from(HookStateKeys.PREFIX_CANDIDATE_ID, 'hex').compare(stateKey, 0, 4) === 0) {
            return {
                key: hexKey,
                type: this.StateTypes.CANDIDATE_ID
            };
        }
        else if (Buffer.from(HookStateKeys.PREFIX_CANDIDATE_OWNER, 'hex').compare(stateKey, 0, 4) === 0) {
            return {
                key: hexKey,
                type: this.StateTypes.CANDIDATE_OWNER
            };
        }
        else if (Buffer.from(HookStateKeys.HOST_COUNT, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MOMENT_BASE_INFO, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HOST_REG_FEE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MAX_REG, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.REWARD_INFO, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.GOVERNANCE_INFO, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.TRX_FEE_BASE_INFO, 'hex').compare(stateKey) === 0) {
            return {
                key: hexKey,
                type: this.StateTypes.SIGLETON
            };
        }
        else if (Buffer.from(HookStateKeys.EVR_ISSUER_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.FOUNDATION_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MOMENT_SIZE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HOST_HEARTBEAT_FREQ, 'hex').compare(stateKey) ||
            Buffer.from(HookStateKeys.MINT_LIMIT, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.FIXED_REG_FEE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.LEASE_ACQUIRE_WINDOW, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.REWARD_CONFIGURATION, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MAX_TOLERABLE_DOWNTIME, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MOMENT_TRANSIT_INFO, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MAX_TRX_EMISSION_FEE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.REGISTRY_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HEARTBEAT_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.GOVERNANCE_CONFIGURATION, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.NETWORK_CONFIGURATION, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.REPUTATION_ADDR, 'hex').compare(stateKey) === 0) {
            return {
                key: hexKey,
                type: this.StateTypes.CONFIGURATION
            };
        }
        else
            throw { type: 'Validation Error', message: 'Invalid state key.' };
    }

    /**
     * Generates a state key for a token ID.
     * @param {string} uriToken - The URI token in hexadecimal format.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateTokenIdStateKey(uriToken) {
        // 1 byte - Key Type.
        let buf = Buffer.alloc(1, 0);
        buf.writeUInt8(STATE_KEY_TYPES.TOKEN_ID);

        const uriTokenBuf = Buffer.from(uriToken, "hex");
        const stateKeyBuf = (Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, uriTokenBuf.slice(4, 32)]));
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for a host address.
     * @param {string} address - The host address.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateHostAddrStateKey(address) {
        // 1 byte - Key Type.
        // 8 bytes - Zeros.
        let buf = Buffer.alloc(9, 0);
        buf.writeUInt8(STATE_KEY_TYPES.HOST_ADDR);
        for (let i = 0; i < HOST_ADDR_KEY_ZERO_COUNT; i++) {
            buf.writeUInt8(0, i + 1);
        }

        const addrBuf = Buffer.from(codec.decodeAccountID(address), "hex");
        const stateKeyBuf = Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, addrBuf]);
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for a reputation host address.
     * @param {string} address - The reputation host address.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateReputationHostAddrStateKey(address) {
        const buf = Buffer.alloc(STATE_KEY_SIZE, 0);
        Buffer.from(codec.decodeAccountID(address), "hex").copy(buf, buf.length - ACCOUNT_ID_SIZE);

        return buf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for a reputation host order address.
     * @param {string} address - The reputation host address.
     * @param {number} moment - The moment timestamp.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateReputationHostOrderAddressStateKey(address, moment) {
        const buf = Buffer.alloc(STATE_KEY_SIZE, 0);
        const offset = buf.length - ACCOUNT_ID_SIZE - 8;
        buf.writeBigUInt64LE(BigInt(moment), offset);
        Buffer.from(codec.decodeAccountID(address), "hex").copy(buf, offset + 8);

        return buf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for a reputation host ordered ID.
     * @param {string} orderedId - The ordered ID.
     * @param {number} moment - The moment timestamp.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateReputationHostOrderedIdStateKey(orderedId, moment) {
        let buf = Buffer.alloc(STATE_KEY_SIZE, 0);
        const offset = buf.length - 16;
        buf.writeBigUInt64LE(BigInt(moment), offset);
        buf.writeBigUInt64LE(BigInt(orderedId), offset + 8);

        return buf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for a reputation host count.
     * @param {number} moment - The moment timestamp.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateReputationHostCountStateKey(moment) {
        let buf = Buffer.alloc(STATE_KEY_SIZE, 0);
        const offset = buf.length - 8;
        buf.writeBigUInt64LE(BigInt(moment), offset);

        return buf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for reputation contract information.
     * @param {string} address - The contract address.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateReputationContractInfoStateKey(address) {
        const buf = Buffer.alloc(STATE_KEY_SIZE, 0);
        Buffer.from(EVERNODE_PREFIX, "utf-8").copy(buf, 0);
        buf.writeUInt8(STATE_KEY_TYPES.REPUTATION_CONTRACT_INFO, 3);
        const offset = buf.length - ACCOUNT_ID_SIZE;
        Buffer.from(codec.decodeAccountID(address), "hex").copy(buf, offset);

        return buf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for a transferee address.
     * @param {string} address - The transferee address.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateTransfereeAddrStateKey(address) {
        // 1 byte - Key Type.
        // 8 bytes - Zeros.
        let buf = Buffer.alloc(9, 0);
        buf.writeUInt8(STATE_KEY_TYPES.TRANSFEREE_ADDR);
        for (let i = 0; i < TRANSFEREE_ADDR_KEY_ZERO_COUNT; i++) {
            buf.writeUInt8(0, i + 1);
        }

        const addrBuf = Buffer.from(codec.decodeAccountID(address), "hex");
        const stateKeyBuf = Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, addrBuf]);
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for a candidate ID.
     * @param {string} uniqueId - The unique candidate ID.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateCandidateIdStateKey(uniqueId) {
        // 1 byte - Key Type.
        let buf = Buffer.alloc(1, 0);
        buf.writeUInt8(STATE_KEY_TYPES.CANDIDATE_ID);

        const idBuf = Buffer.from(uniqueId, "hex");
        const stateKeyBuf = (Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, idBuf.slice(4, 32)]));
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    /**
     * Generates a state key for a candidate owner.
     * @param {string} owner - The candidate owner address.
     * @returns {string} The generated state key as a hexadecimal string.
     */
    static generateCandidateOwnerStateKey(owner) {
        // 1 byte - Key Type.
        // 8 bytes - Zeros.
        let buf = Buffer.alloc(9, 0);
        buf.writeUInt8(STATE_KEY_TYPES.CANDIDATE_OWNER);
        for (let i = 0; i < CANDIDATE_OWNER_KEY_ZERO_COUNT; i++) {
            buf.writeUInt8(0, i + 1);
        }

        const addrBuf = Buffer.from(codec.decodeAccountID(owner), "hex");
        const stateKeyBuf = Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, addrBuf]);
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    /**
     * Gets the hook state index for a specific hook account and state key.
     * @param {string} hookAccount - The hook account address.
     * @param {string} stateKey - The state key as a hexadecimal string.
     * @param {string} [hookNamespace=EvernodeConstants.HOOK_NAMESPACE] - The hook namespace.
     * @returns {string} The hook state index as a hexadecimal string.
     */
    static getHookStateIndex(hookAccount, stateKey, hookNamespace = EvernodeConstants.HOOK_NAMESPACE) {
        const typeBuf = Buffer.alloc(2, 0);
        typeBuf.writeInt16BE(HOOK_STATE_LEDGER_TYPE_PREFIX);

        const accIdBuf = codec.decodeAccountID(hookAccount);
        const stateKeyBuf = Buffer.from(stateKey, 'hex');
        const namespaceBuf = Buffer.from(hookNamespace, 'hex');

        let hash = crypto.createHash('sha512');

        let data = hash.update(typeBuf);
        data = hash.update(accIdBuf);
        data = hash.update(stateKeyBuf);
        data = hash.update(namespaceBuf);

        const digest = data.digest('hex');
        // Get the first 32 bytes of hash.
        return digest.substring(0, 64).toUpperCase();
    }

    /**
     * Generates a new hook candidate ID based on hash buffers.
     * @param {Buffer} hashesBuf - The buffer containing the hash data.
     * @returns {string} The generated candidate ID as a hexadecimal string.
     */
    static getNewHookCandidateId(hashesBuf) {
        const idBuf = Buffer.alloc(32, 0);
        idBuf.writeUInt8(EvernodeConstants.CandidateTypes.NewHook, 4);
        Buffer.from(sha512Half(hashesBuf)).copy(idBuf, 5, 5);
        return idBuf.toString('hex').toUpperCase();
    }

    /**
     * Generates a candidate ID for the piloted mode.
     * @returns {string} The generated candidate ID as a hexadecimal string.
     */
    static getPilotedModeCandidateId() {
        const idBuf = Buffer.alloc(32, 0);
        idBuf.writeUInt8(EvernodeConstants.CandidateTypes.PilotedMode, 4);
        Buffer.from(EvernodeConstants.HOOK_NAMESPACE, 'hex').copy(idBuf, 5, 5);
        return idBuf.toString('hex').toUpperCase();
    }

    /**
     * Generates a candidate ID for a dud host.
     * @param {string} hostAddress - The host address.
     * @returns {string} The generated candidate ID as a hexadecimal string.
     */
    static getDudHostCandidateId(hostAddress) {
        const idBuf = Buffer.alloc(32, 0);
        idBuf.writeUInt8(EvernodeConstants.CandidateTypes.DudHost, 4);
        codec.decodeAccountID(hostAddress).copy(idBuf, 12);
        return idBuf.toString('hex').toUpperCase();
    }

    /**
     * Retrieves the candidate type from a candidate ID.
     * @param {string} candidateId - The candidate ID as a hexadecimal string.
     * @returns {number} The candidate type.
     */
    static getCandidateType(candidateId) {
        return Buffer.from(candidateId, 'hex').readUInt8(4);
    }
}

module.exports = {
    StateHelpers
}
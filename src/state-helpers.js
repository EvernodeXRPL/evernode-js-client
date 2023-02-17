const codec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { HookStateKeys, EvernodeConstants } = require('./evernode-common');
const { XflHelpers } = require('./xfl-helpers');
const crypto = require("crypto");
const { UtilHelpers } = require('./util-helpers');

const NFTOKEN_PREFIX = '00000000';

const EPOCH_OFFSET = 0;
const SAVED_MOMENT_OFFSET = 1;
const PREV_MOMENT_ACTIVE_HOST_COUNT_OFFSET = 5;
const CUR_MOMENT_ACTIVE_HOST_COUNT_OFFSET = 9;
const EPOCH_POOL_OFFSET = 13;

const EPOCH_COUNT_OFFSET = 0;
const FIRST_EPOCH_REWARD_QUOTA_OFFSET = 1;
const EPOCH_REWARD_AMOUNT_OFFSET = 5;
const REWARD_START_MOMENT_OFFSET = 9;

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
const CANDIDATE_REJECT_AVERAGE_OFFSET = 14;

const GOVERNANCE_MODE_OFFSET = 0;
const LAST_CANDIDATE_IDX_OFFSET = 1;
const VOTER_BASE_COUNT_OFFSET = 3;
const VOTER_BASE_COUNT_CHANGED_TIMESTAMP_OFFSET = 7;
const FOUNDATION_LAST_VOTED_CANDIDATE_IDX = 15;
const ELECTED_PROPOSAL_UNIQUE_ID_OFFSET = 17;
const PROPOSAL_ELECTED_TIMESTAMP_OFFSET = 49;
const UPDATED_HOOK_COUNT_OFFSET = 57;

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

const HOST_ADDRESS_OFFSET = 0;
const HOST_CPU_MODEL_NAME_OFFSET = 20;
const HOST_CPU_COUNT_OFFSET = 60;
const HOST_CPU_SPEED_OFFSET = 62;
const HOST_CPU_MICROSEC_OFFSET = 64;
const HOST_RAM_MB_OFFSET = 68;
const HOST_DISK_MB_OFFSET = 72;
const HOST_EMAIL_ADDRESS_OFFSET = 76;

const PREV_HOST_ADDRESS_OFFSET = 0;
const TRANSFER_LEDGER_IDX_OFFSET = 20;
const TRANSFERRED_NFT_ID_OFFSET = 28;

const CANDIDATE_GOVERNOR_HOOK_HASH_OFFSET = 0;
const CANDIDATE_REGISTRY_HOOK_HASH_OFFSET = 32;
const CANDIDATE_HEARTBEAT_HOOK_HASH_OFFSET = 64;

const CANDIDATE_OWNER_ADDRESS_OFFSET = 0;
const CANDIDATE_IDX_OFFSET = 20;
const CANDIDATE_SHORT_NAME_OFFSET = 22;
const CANDIDATE_CREATED_TIMESTAMP_OFFSET = 42;
const CANDIDATE_PROPOSAL_FEE_OFFSET = 50;
const CANDIDATE_POSITIVE_VOTE_COUNT_OFFSET = 58;
const CANDIDATE_NEGATIVE_VOTE_COUNT_OFFSET = 62;
const CANDIDATE_LAST_VOTE_TIMESTAMP_OFFSET = 66;
const CANDIDATE_STATUS_OFFSET = 74;
const CANDIDATE_STATUS_CHANGE_TIMESTAMP_OFFSET = 75;
const CANDIDATE_FOUNDATION_VOTE_STATUS_OFFSET = 83;

const STATE_KEY_TYPES = {
    TOKEN_ID: 2,
    HOST_ADDR: 3,
    TRANSFEREE_ADDR: 4,
    CANDIDATE_OWNER: 5,
    CANDIDATE_ID: 6
}

const MOMENT_TYPES = {
    LEDGER: 0,
    TIMESTAMP: 1
}

const TRANSFER_STATES = {
    NO_TRANSFER: 0,
    HAS_A_TRANSFER: 1
}

const GOVERNANCE_MODES = {
    PILOTED: 1,
    CO_PILOTED: 2,
    AUTO_PILOTED: 3
}

const CANDIDATE_STATUSES = {
    CANDIDATE_ABSTAINED: 0,
    CANDIDATE_SUPPORTED: 1,
    CANDIDATE_REJECTED: 2
}

const EVERNODE_PREFIX = 'EVR';
const HOST_ADDR_KEY_ZERO_COUNT = 8;
const TRANSFEREE_ADDR_KEY_ZERO_COUNT = 8;
const CANDIDATE_OWNER_KEY_ZERO_COUNT = 8;
const HOOK_STATE_LEDGER_TYPE_PREFIX = 118; // Decimal value of ASCII 'v'
const PENDING_TRANSFER = 1;
const HOST_EMAIL_ADDRESS_LEN = 40;

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

    static getStateData(states, key) {
        const state = states.find(s => key === s.key);
        if (!state)
            return null;

        return state.data;
    }

    static decodeHostAddressState(stateKeyBuf, stateDataBuf) {
        let data = {
            address: codec.encodeAccountID(stateKeyBuf.slice(12)),
            nfTokenId: stateDataBuf.slice(HOST_TOKEN_ID_OFFSET, HOST_COUNTRY_CODE_OFFSET).toString('hex').toUpperCase(),
            countryCode: stateDataBuf.slice(HOST_COUNTRY_CODE_OFFSET, HOST_RESERVED_OFFSET).toString(),
            description: stateDataBuf.slice(HOST_DESCRIPTION_OFFSET, HOST_REG_LEDGER_OFFSET).toString().replace(/\0/g, ''),
            registrationLedger: Number(stateDataBuf.readBigUInt64BE(HOST_REG_LEDGER_OFFSET)),
            registrationFee: Number(stateDataBuf.readBigUInt64BE(HOST_REG_FEE_OFFSET)),
            maxInstances: stateDataBuf.readUInt32BE(HOST_TOT_INS_COUNT_OFFSET),
            activeInstances: stateDataBuf.readUInt32BE(HOST_ACT_INS_COUNT_OFFSET),
            lastHeartbeatIndex: Number(stateDataBuf.readBigUInt64BE(HOST_HEARTBEAT_TIMESTAMP_OFFSET)),
            version: `${stateDataBuf.readUInt8(HOST_VERSION_OFFSET)}.${stateDataBuf.readUInt8(HOST_VERSION_OFFSET + 1)}.${stateDataBuf.readUInt8(HOST_VERSION_OFFSET + 2)}`,
            isATransferer: (stateDataBuf.length > HOST_TRANSFER_FLAG_OFFSET && (stateDataBuf.readUInt8(HOST_TRANSFER_FLAG_OFFSET) === PENDING_TRANSFER)) ? TRANSFER_STATES.HAS_A_TRANSFER : TRANSFER_STATES.NO_TRANSFER,
            lastVoteCandidateIdx: stateDataBuf.length > HOST_LAST_VOTE_CANDIDATE_IDX_OFFSET ? stateDataBuf.readUInt16BE(HOST_LAST_VOTE_CANDIDATE_IDX_OFFSET) : 0,
        }
        if (stateDataBuf.length > HOST_REG_TIMESTAMP_OFFSET)
            data.registrationTimestamp = Number(stateDataBuf.readBigUInt64BE(HOST_REG_TIMESTAMP_OFFSET));
        return data;
    }

    static decodeTokenIdState(stateDataBuf) {
        return {
            address: codec.encodeAccountID(stateDataBuf.slice(HOST_ADDRESS_OFFSET, HOST_CPU_MODEL_NAME_OFFSET)),
            cpuModelName: stateDataBuf.slice(HOST_CPU_MODEL_NAME_OFFSET, HOST_CPU_COUNT_OFFSET).toString().replace(/\x00+$/, ''), // Remove trailing \x00 characters.
            cpuCount: stateDataBuf.readUInt16BE(HOST_CPU_COUNT_OFFSET),
            cpuMHz: stateDataBuf.readUInt16BE(HOST_CPU_SPEED_OFFSET),
            cpuMicrosec: stateDataBuf.readUInt32BE(HOST_CPU_MICROSEC_OFFSET),
            ramMb: stateDataBuf.readUInt32BE(HOST_RAM_MB_OFFSET),
            diskMb: stateDataBuf.readUInt32BE(HOST_DISK_MB_OFFSET),
            email: (stateDataBuf.length > HOST_EMAIL_ADDRESS_OFFSET ?
                stateDataBuf.slice(HOST_EMAIL_ADDRESS_OFFSET, HOST_EMAIL_ADDRESS_OFFSET + HOST_EMAIL_ADDRESS_LEN).toString().toString().replace(/\0/g, '') :
                "")
        }
    }

    static decodeTransfereeAddrState(stateKeyBuf, stateDataBuf) {
        const prevHostClassicAddress = codec.encodeAccountID(stateDataBuf.slice(PREV_HOST_ADDRESS_OFFSET, TRANSFER_LEDGER_IDX_OFFSET));
        return {
            futureOwnerAddress: codec.encodeAccountID(stateKeyBuf.slice(12)),
            prevHostAddressKey: this.generateHostAddrStateKey(prevHostClassicAddress),
            prevHostAddress: prevHostClassicAddress,
            transferLedgerIdx: Number(stateDataBuf.readBigUInt64BE(TRANSFER_LEDGER_IDX_OFFSET)),
            transferredNfTokenId: stateDataBuf.slice(TRANSFERRED_NFT_ID_OFFSET, 60).toString('hex').toUpperCase()
        }
    }

    static decodeCandidateOwnerState(stateKeyBuf, stateDataBuf) {
        let data = {
            ownerAddress: codec.encodeAccountID(stateKeyBuf.slice(12)),
            uniqueId: UtilHelpers.getCandidateUniqueId(stateDataBuf),
            governorHookHash: stateDataBuf.slice(CANDIDATE_GOVERNOR_HOOK_HASH_OFFSET, CANDIDATE_REGISTRY_HOOK_HASH_OFFSET).toString('hex').toUpperCase(),
            registryHookHash: stateDataBuf.slice(CANDIDATE_REGISTRY_HOOK_HASH_OFFSET, CANDIDATE_HEARTBEAT_HOOK_HASH_OFFSET).toString('hex').toUpperCase(),
            heartbeatHookHash: stateDataBuf.slice(CANDIDATE_HEARTBEAT_HOOK_HASH_OFFSET, CANDIDATE_HEARTBEAT_HOOK_HASH_OFFSET + 32).toString('hex').toUpperCase(),
        }
        return data;
    }

    static decodeCandidateIdState(stateDataBuf) {
        let status = '';
        switch (stateDataBuf.readUInt8(CANDIDATE_STATUS_OFFSET)) {
            case CANDIDATE_STATUSES.CANDIDATE_ABSTAINED:
                status = 'abstained';
                break;
            case CANDIDATE_STATUSES.CANDIDATE_SUPPORTED:
                status = 'supported';
                break;
            case CANDIDATE_STATUSES.CANDIDATE_REJECTED:
                status = 'rejected';
                break;
            default:
                status = 'undefined';
                break;
        }
        let foundationStatus = '';
        switch (stateDataBuf.readUInt8(CANDIDATE_FOUNDATION_VOTE_STATUS_OFFSET)) {
            case CANDIDATE_STATUSES.CANDIDATE_ABSTAINED:
                foundationStatus = 'abstained';
                break;
            case CANDIDATE_STATUSES.CANDIDATE_SUPPORTED:
                foundationStatus = 'supported';
                break;
            case CANDIDATE_STATUSES.CANDIDATE_REJECTED:
                foundationStatus = 'rejected';
                break;
            default:
                foundationStatus = 'undefined';
                break;
        }
        return {
            ownerAddress: codec.encodeAccountID(stateDataBuf.slice(CANDIDATE_OWNER_ADDRESS_OFFSET, CANDIDATE_SHORT_NAME_OFFSET)),
            index: stateDataBuf.readUInt16BE(CANDIDATE_IDX_OFFSET),
            shortName: stateDataBuf.slice(CANDIDATE_SHORT_NAME_OFFSET, CANDIDATE_CREATED_TIMESTAMP_OFFSET).toString().replace(/\x00+$/, ''), // Remove trailing \x00 characters.
            createdTimestamp: Number(stateDataBuf.readBigUInt64BE(CANDIDATE_CREATED_TIMESTAMP_OFFSET)),
            proposalFee: Number(stateDataBuf.readBigUInt64BE(CANDIDATE_PROPOSAL_FEE_OFFSET)),
            positiveVoteCount: stateDataBuf.readUInt32BE(CANDIDATE_POSITIVE_VOTE_COUNT_OFFSET),
            negativeVoteCount: stateDataBuf.readUInt32BE(CANDIDATE_NEGATIVE_VOTE_COUNT_OFFSET),
            lastVoteTimestamp: Number(stateDataBuf.readBigUInt64BE(CANDIDATE_LAST_VOTE_TIMESTAMP_OFFSET)),
            status: status,
            statusChangeTimestamp: Number(stateDataBuf.readBigUInt64BE(CANDIDATE_STATUS_CHANGE_TIMESTAMP_OFFSET)),
            foundationVoteStatus: foundationStatus
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
            return {
                type: this.StateTypes.CANDIDATE_OWNER,
                key: hexKey,
                ...this.decodeCandidateOwnerState(stateKey, stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.PREFIX_CANDIDATE_ID, 'hex').compare(stateKey, 0, 4) === 0) {
            // Generate the owner state key.
            const ownerKeyBuf = Buffer.alloc(32, 0);
            Buffer.from(HookStateKeys.PREFIX_CANDIDATE_OWNER, 'hex').copy(ownerKeyBuf);
            stateData.copy(ownerKeyBuf, 12, CANDIDATE_OWNER_ADDRESS_OFFSET, CANDIDATE_SHORT_NAME_OFFSET)
            return {
                type: this.StateTypes.CANDIDATE_ID,
                key: hexKey,
                ownerKey: ownerKeyBuf.toString('hex').toUpperCase(),
                ...this.decodeCandidateIdState(stateData)
            }
        }
        else if (Buffer.from(HookStateKeys.HOST_COUNT, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: stateData.readUInt32BE()
            }
        }
        else if (Buffer.from(HookStateKeys.MOMENT_BASE_INFO, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: {
                    baseIdx: Number(stateData.readBigUInt64BE(MOMENT_BASE_POINT_OFFSET)),
                    baseTransitionMoment: stateData.length > MOMENT_AT_TRANSITION_OFFSET ? stateData.readUInt32BE(MOMENT_AT_TRANSITION_OFFSET) : 0,
                    momentType: (stateData.length <= MOMENT_TYPE_OFFSET || stateData.readUInt8(MOMENT_TYPE_OFFSET) === MOMENT_TYPES.LEDGER) ? 'ledger' : 'timestamp'
                }
            }
        }
        else if (Buffer.from(HookStateKeys.HOST_REG_FEE, 'hex').compare(stateKey) === 0 || Buffer.from(HookStateKeys.MAX_REG, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: Number(stateData.readBigUInt64BE())
            }
        }
        else if (Buffer.from(HookStateKeys.REGISTRY_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HEARTBEAT_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.EVR_ISSUER_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.FOUNDATION_ADDR, 'hex').compare(stateKey) === 0) {
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
        else if (Buffer.from(HookStateKeys.REWARD_CONFIGURATION, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: {
                    epochCount: stateData.readUInt8(EPOCH_COUNT_OFFSET),
                    firstEpochRewardQuota: stateData.readUInt32BE(FIRST_EPOCH_REWARD_QUOTA_OFFSET),
                    epochRewardAmount: stateData.readUInt32BE(EPOCH_REWARD_AMOUNT_OFFSET),
                    rewardStartMoment: stateData.readUInt32BE(REWARD_START_MOMENT_OFFSET)
                }
            }
        }
        else if (Buffer.from(HookStateKeys.REWARD_INFO, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.SIGLETON,
                key: hexKey,
                value: {
                    epoch: stateData.readUInt8(EPOCH_OFFSET),
                    savedMoment: stateData.readUInt32BE(SAVED_MOMENT_OFFSET),
                    prevMomentActiveHostCount: stateData.readUInt32BE(PREV_MOMENT_ACTIVE_HOST_COUNT_OFFSET),
                    curMomentActiveHostCount: stateData.readUInt32BE(CUR_MOMENT_ACTIVE_HOST_COUNT_OFFSET),
                    epochPool: XflHelpers.toString(stateData.readBigInt64BE(EPOCH_POOL_OFFSET))
                }
            }
        }
        else if (Buffer.from(HookStateKeys.MAX_TOLERABLE_DOWNTIME, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: stateData.readUInt16BE()
            }
        }
        else if (Buffer.from(HookStateKeys.MOMENT_TRANSIT_INFO, 'hex').compare(stateKey) === 0) {
            Buffer.alloc(1).readUInt8()
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: {
                    transitionIndex: Number(stateData.readBigInt64BE(TRANSIT_IDX_OFFSET)),
                    momentSize: stateData.readUInt16BE(TRANSIT_MOMENT_SIZE_OFFSET),
                    momentType: stateData.readUInt8(TRANSIT_MOMENT_TYPE_OFFSET) === MOMENT_TYPES.LEDGER ? 'ledger' : 'timestamp'
                }
            }
        }
        else if (Buffer.from(HookStateKeys.MAX_TRX_EMISSION_FEE, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: Number(stateData.readBigUInt64BE())
            }
        }
        else if (Buffer.from(HookStateKeys.GOVERNANCE_CONFIGURATION, 'hex').compare(stateKey) === 0) {
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: {
                    eligibilityPeriod: stateData.readUInt32BE(ELIGIBILITY_PERIOD_OFFSET),
                    candidateLifePeriod: stateData.readUInt32BE(CANDIDATE_LIFE_PERIOD_OFFSET),
                    candidateElectionPeriod: stateData.readUInt32BE(CANDIDATE_ELECTION_PERIOD_OFFSET),
                    candidateSupportAverage: stateData.readUInt16BE(CANDIDATE_SUPPORT_AVERAGE_OFFSET),
                    candidateRejectAverage: stateData.readUInt16BE(CANDIDATE_REJECT_AVERAGE_OFFSET)
                }
            }
        }
        else if (Buffer.from(HookStateKeys.GOVERNANCE_INFO, 'hex').compare(stateKey) === 0) {
            let mode = '';
            switch (stateData.readUInt8(GOVERNANCE_MODE_OFFSET)) {
                case GOVERNANCE_MODES.PILOTED:
                    mode = 'piloted';
                    break;
                case GOVERNANCE_MODES.CO_PILOTED:
                    mode = 'co-piloted';
                    break;
                case GOVERNANCE_MODES.AUTO_PILOTED:
                    mode = 'auto-piloted';
                    break;
                default:
                    mode = 'undefined';
                    break;
            }
            return {
                type: this.StateTypes.CONFIGURATION,
                key: hexKey,
                value: {
                    governanceMode: mode,
                    lastCandidateIds: stateData.readUInt16BE(LAST_CANDIDATE_IDX_OFFSET),
                    voteBaseCount: stateData.readUInt32BE(VOTER_BASE_COUNT_OFFSET),
                    voteBaseCountChangedTimestamp: Number(stateData.readBigUInt64BE(VOTER_BASE_COUNT_CHANGED_TIMESTAMP_OFFSET)),
                    foundationLastVotedCandidateIds: stateData.readUInt16BE(FOUNDATION_LAST_VOTED_CANDIDATE_IDX),
                    electedProposalUniqueId: stateData.readUInt32BE(ELECTED_PROPOSAL_UNIQUE_ID_OFFSET),
                    proposalElectedTimestamp: Number(stateData.readBigUInt64BE(PROPOSAL_ELECTED_TIMESTAMP_OFFSET)),
                    updatedHookCount: stateData.readUInt8(UPDATED_HOOK_COUNT_OFFSET)
                }
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
            Buffer.from(HookStateKeys.REWARD_INFO, 'hex').compare(stateKey) === 0) {
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
            Buffer.from(HookStateKeys.FIXED_REG_FEE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.LEASE_ACQUIRE_WINDOW, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.REWARD_CONFIGURATION, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MAX_TOLERABLE_DOWNTIME, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MOMENT_TRANSIT_INFO, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.MAX_TRX_EMISSION_FEE, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.REGISTRY_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.HEARTBEAT_ADDR, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.GOVERNANCE_CONFIGURATION, 'hex').compare(stateKey) === 0 ||
            Buffer.from(HookStateKeys.GOVERNANCE_INFO, 'hex').compare(stateKey) === 0) {
            return {
                key: hexKey,
                type: this.STATE_TYPES.CONFIGURATION
            };
        }
        else
            throw { type: 'Validation Error', message: 'Invalid state key.' };
    }

    static generateTokenIdStateKey(nfTokenId) {
        // 1 byte - Key Type.
        let buf = Buffer.allocUnsafe(1);
        buf.writeUInt8(STATE_KEY_TYPES.TOKEN_ID);

        const nfTokenIdBuf = Buffer.from(nfTokenId, "hex");
        const stateKeyBuf = (Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, nfTokenIdBuf.slice(4, 32)]));
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    static generateHostAddrStateKey(address) {
        // 1 byte - Key Type.
        // 8 bytes - Zeros.
        let buf = Buffer.allocUnsafe(9);
        buf.writeUInt8(STATE_KEY_TYPES.HOST_ADDR);
        for (let i = 0; i < HOST_ADDR_KEY_ZERO_COUNT; i++) {
            buf.writeUInt8(0, i + 1);
        }

        const addrBuf = Buffer.from(codec.decodeAccountID(address), "hex");
        const stateKeyBuf = Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, addrBuf]);
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    static generateTransfereeAddrStateKey(address) {
        // 1 byte - Key Type.
        // 8 bytes - Zeros.
        let buf = Buffer.allocUnsafe(9);
        buf.writeUInt8(STATE_KEY_TYPES.TRANSFEREE_ADDR);
        for (let i = 0; i < TRANSFEREE_ADDR_KEY_ZERO_COUNT; i++) {
            buf.writeUInt8(0, i + 1);
        }

        const addrBuf = Buffer.from(codec.decodeAccountID(address), "hex");
        const stateKeyBuf = Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, addrBuf]);
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    static generateCandidateIdStateKey(uniqueId) {
        // 1 byte - Key Type.
        let buf = Buffer.allocUnsafe(1);
        buf.writeUInt8(STATE_KEY_TYPES.CANDIDATE_ID);

        const idBuf = Buffer.from(uniqueId, "hex");
        const stateKeyBuf = (Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, idBuf.slice(4, 32)]));
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    static generateCandidateOwnerStateKey(owner) {
        // 1 byte - Key Type.
        // 8 bytes - Zeros.
        let buf = Buffer.allocUnsafe(9);
        buf.writeUInt8(STATE_KEY_TYPES.CANDIDATE_OWNER);
        for (let i = 0; i < CANDIDATE_OWNER_KEY_ZERO_COUNT; i++) {
            buf.writeUInt8(0, i + 1);
        }

        const addrBuf = Buffer.from(codec.decodeAccountID(owner), "hex");
        const stateKeyBuf = Buffer.concat([Buffer.from(EVERNODE_PREFIX, "utf-8"), buf, addrBuf]);
        return stateKeyBuf.toString('hex').toUpperCase();
    }

    static getHookStateIndex(hookAccount, stateKey, hookNamespace = EvernodeConstants.HOOK_NAMESPACE) {
        const typeBuf = Buffer.allocUnsafe(2);
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
}

module.exports = {
    StateHelpers
}
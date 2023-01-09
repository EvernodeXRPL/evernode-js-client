const EvernodeConstants = {
    EVR: 'EVR',
    NFT_PREFIX_HEX: '657672686F7374', // evrhost
    LEASE_NFT_PREFIX_HEX: '6576726C65617365', // evrlease
    HOOK_NAMESPACE: '01EAF09326B4911554384121FF56FA8FECC215FDDE2EC35D9E59F2C53EC665A0',
    NOW_IN_EVRS: "0.00000001"
}

const MemoTypes = {
    ACQUIRE_LEASE: 'evnAcquireLease',
    ACQUIRE_SUCCESS: 'evnAcquireSuccess',
    ACQUIRE_ERROR: 'evnAcquireError',
    ACQUIRE_REF: 'evnAcquireRef',
    HOST_REG: 'evnHostReg',
    HOST_DEREG: 'evnHostDereg',
    HOST_UPDATE_INFO: 'evnHostUpdateReg',
    HEARTBEAT: 'evnHeartbeat',
    HOST_POST_DEREG: 'evnHostPostDereg',
    HOST_TRANSFER: 'evnTransfer',
    EXTEND_LEASE: 'evnExtendLease',
    EXTEND_SUCCESS: 'evnExtendSuccess',
    EXTEND_ERROR: 'evnExtendError',
    EXTEND_REF: 'evnExtendRef',
    REGISTRY_INIT: 'evnInitialize',
    REFUND: 'evnRefund',
    REFUND_REF: 'evnRefundRef',
    DEAD_HOST_PRUNE: 'evnDeadHostPrune',
    HOST_REBATE: 'evnHostRebate',
    HOST_REGISTRY_REF: 'evnHostRegistryRef'
}

const MemoFormats = {
    TEXT: 'text/plain',
    JSON: 'text/json',
    BASE64: 'base64',
    HEX: 'hex'
}

const ErrorCodes = {
    ACQUIRE_ERR: 'ACQUIRE_ERR',
    EXTEND_ERR: 'EXTEND_ERR'
}

const ErrorReasons = {
    TRANSACTION_FAILURE: 'TRANSACTION_FAILURE',
    NO_OFFER: 'NO_OFFER',
    NO_NFT: 'NO_NFT',
    INTERNAL_ERR: 'INTERNAL_ERR',
    TIMEOUT: 'TIMEOUT',
    HOST_INVALID: 'HOST_INVALID',
    HOST_INACTIVE: 'HOST_INACTIVE',
    NO_STATE_KEY: 'NO_STATE_KEY'
}

// All keys are prefixed with 'EVR' (0x455652)
// Config keys sub-prefix: 0x01
const HookStateKeys = {
    // Configuration.
    EVR_ISSUER_ADDR: "4556520100000000000000000000000000000000000000000000000000000001",
    FOUNDATION_ADDR: "4556520100000000000000000000000000000000000000000000000000000002",
    MOMENT_SIZE: "4556520100000000000000000000000000000000000000000000000000000003",
    MINT_LIMIT: "4556520100000000000000000000000000000000000000000000000000000004",
    FIXED_REG_FEE: "4556520100000000000000000000000000000000000000000000000000000005",
    HOST_HEARTBEAT_FREQ: "4556520100000000000000000000000000000000000000000000000000000006",
    PURCHASER_TARGET_PRICE: "4556520100000000000000000000000000000000000000000000000000000007",
    LEASE_ACQUIRE_WINDOW: "4556520100000000000000000000000000000000000000000000000000000008",
    REWARD_CONFIGURATION: "4556520100000000000000000000000000000000000000000000000000000009",
    MAX_TOLERABLE_DOWNTIME: "455652010000000000000000000000000000000000000000000000000000000A",
    MOMENT_TRANSIT_INFO: "455652010000000000000000000000000000000000000000000000000000000B",
    MAX_TRX_EMISSION_FEE: "455652010000000000000000000000000000000000000000000000000000000C",
    REGISTRY_ADDR: "455652010000000000000000000000000000000000000000000000000000000D",
    HEARTBEAT_ADDR: "455652010000000000000000000000000000000000000000000000000000000E",

    // Singleton
    HOST_COUNT: "4556523200000000000000000000000000000000000000000000000000000000",
    MOMENT_BASE_INFO: "4556523300000000000000000000000000000000000000000000000000000000",
    HOST_REG_FEE: "4556523400000000000000000000000000000000000000000000000000000000",
    MAX_REG: "4556523500000000000000000000000000000000000000000000000000000000",
    REWARD_INFO: "4556523600000000000000000000000000000000000000000000000000000000",

    // Prefixes
    PREFIX_HOST_TOKENID: "45565202",
    PREFIX_HOST_ADDR: "45565203",
    PREFIX_TRANSFEREE_ADDR: "45565204",
}

const EvernodeEvents = {
    HostRegistered: "HostRegistered",
    HostDeregistered: "HostDeregistered",
    HostPostDeregistered: "HostPostDeregistered",
    HostTransfer: "HostTransfer",
    AcquireLease: "AcquireLease",
    AcquireSuccess: "AcquireSuccess",
    AcquireError: "AcquireError",
    Heartbeat: "Heartbeat",
    ExtendLease: "ExtendLease",
    ExtendSuccess: "ExtendSuccess",
    ExtendError: "ExtendError",
    HostRegUpdated: "HostRegUpdated",
    HostReRegistered: "HostReRegistered",
    RegistryInitialized: "RegistryInitialized",
    DeadHostPrune: "DeadHostPrune",
    HostRebate: "HostRebate"
}

module.exports = {
    EvernodeConstants,
    MemoTypes,
    MemoFormats,
    ErrorCodes,
    ErrorReasons,
    HookStateKeys,
    EvernodeEvents
}
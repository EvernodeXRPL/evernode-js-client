const EvernodeConstants = {
    EVR: 'EVR'
}

const MemoTypes = {
    REDEEM: 'evnRedeem',
    REDEEM_ORIGIN: 'evnRedeemOrigin',
    REDEEM_SUCCESS: 'evnRedeemSuccess',
    REDEEM_ERROR: 'evnRedeemError',
    REDEEM_REF: 'evnRedeemRef',
    HOST_REG: 'evnHostReg',
    HOST_DEREG: 'evnHostDereg',
    REFUND: 'evnRefund',
    REFUND_SUCCESS: 'evnRefundSuccess',
    REFUND_ERROR: 'evnRefundError',
    AUDIT: 'evnAudit',
    AUDIT_SUCCESS: 'evnAuditSuccess',
    AUDIT_FAILED: 'evnAuditFailed',
    AUDIT_ASSIGNMENT: 'evnAuditAssignment',
    REWARD: 'evnReward'
}

const MemoFormats = {
    TEXT: 'text/plain',
    JSON: 'text/json',
    BASE64: 'base64',
    HEX: 'hex'
}

const ErrorCodes = {
    REDEEM_ERR: 'REDEEM_ERR',
    REFUND_ERR: 'REFUND_ERR',
    AUDIT_REQ_ERROR: 'AUDIT_REQ_ERROR',
    AUDIT_SUCCESS_ERROR: 'AUDIT_SUCCESS_ERROR',
    AUDIT_FAIL_ERROR: 'AUDIT_FAIL_ERROR'
}

const ErrorReasons = {
    TRANSACTION_FAILURE: 'TRANSACTION_FAILURE'
}

// Default hook config values.
// If hook's state is empty, values are loaded from here.
const HookStateDefaults = {
    MOMENT_SIZE: 72,
    HOST_REG_FEE: '0.87654321',
    REDEEM_WINDOW: 24,
    MIN_REDEEM: 12,
    MOMENT_BASE_IDX: 0,
    REWARD_POOL: '0'
}

// All keys are prefixed with 'EVR' (0x455652)
const HookStateKeys = {
    MOMENT_SIZE: "4556520100000000000000000000000000000000000000000000000000000001",
    HOST_REG_FEE: "4556520100000000000000000000000000000000000000000000000000000003",
    MIN_REDEEM: "4556520100000000000000000000000000000000000000000000000000000004",
    REDEEM_WINDOW: "4556520100000000000000000000000000000000000000000000000000000005",
    MOMENT_BASE_IDX: "4556523400000000000000000000000000000000000000000000000000000000",
    REWARD_POOL: "4556523700000000000000000000000000000000000000000000000000000000",

    // Prefixes
    HOST_ADDR: "45565203"
}

const EvernodeEvents = {
    HostRegistered: "HostRegistered",
    HostDeregistered: "HostDeregistered",
    Redeem: "Redeem",
    RedeemSuccess: "RredeemSuccess",
    RedeemError: "RedeemError",
    Refund: "Refund",
    RefundSuccess: "RefundSuccess",
    RefundError: "RefundError",
    Audit: "Audit",
    AuditAssignment: "AuditAssignment",
    AuditSuccess: "AuditSuccess",
    Reward: "Reward",
}

module.exports = {
    EvernodeConstants,
    MemoTypes,
    MemoFormats,
    ErrorCodes,
    ErrorReasons,
    HookStateDefaults,
    HookStateKeys,
    EvernodeEvents
}
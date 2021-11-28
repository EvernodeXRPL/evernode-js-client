export const EvernodeConstants = {
    EVR: 'EVR'
}

export const MemoTypes = {
    REDEEM: 'evnRedeem',
    REDEEM_REF: 'evnRedeemRef',
    REDEEM_RESP: 'evnRedeemResp',
    HOST_REG: 'evnHostReg',
    HOST_DEREG: 'evnHostDereg',
    REFUND: 'evnRefund',
    REFUND_RESP: 'evnRefundResp',
    AUDIT_REQ: 'evnAuditRequest',
    AUDIT_SUCCESS: 'evnAuditSuccess',
    AUDIT_REF: 'evnAuditRef',
    REWARD_REF: 'evnRewardRef'
}

export const MemoFormats = {
    TEXT: 'text/plain',
    JSON: 'text/json',
    BINARY: 'binary'
}

export const ErrorCodes = {
    REDEEM_ERR: 'REDEEM_ERR',
    REFUND_ERR: 'REFUND_ERR',
    AUDIT_REQ_ERROR: 'AUDIT_REQ_ERROR',
    AUDIT_SUCCESS_ERROR: 'AUDIT_SUCCESS_ERROR',
}

// Default hook config values.
// If hook's state is empty, values are loaded from here.
export const HookStateDefaults = {
    MOMENT_SIZE: 72,
    HOST_REG_FEE: '0.87654321',
    REDEEM_WINDOW: 24,
    MIN_REDEEM: 12,
    MOMENT_BASE_IDX: 0,
}

// All keys are prefixed with 'EVR' (0x455652)
export const HookStateKeys = {
    MOMENT_SIZE: "4556520100000000000000000000000000000000000000000000000000000001",
    HOST_REG_FEE: "4556520100000000000000000000000000000000000000000000000000000003",
    MIN_REDEEM: "4556520100000000000000000000000000000000000000000000000000000004",
    REDEEM_WINDOW: "4556520100000000000000000000000000000000000000000000000000000005",
    MOMENT_BASE_IDX: "4556523400000000000000000000000000000000000000000000000000000000",

    // Prefixes
    HOST_ADDR: "45565203"
}

export const EvernodeEvents = {
    HostRegistered: "hostRegistered",
    HostDeregistered: "hostDeregistered",
    Redeem: "redeem",
    RedeemSuccess: "redeemSuccess",
    RedeemError: "redeemError",
    RefundRequest: "refundRequest",
    RefundResp: "refundResp",
    AuditRequest: "auditRequest",
    AuditCheck: "auditCheck",
    AuditSuccess: "auditSuccess",
    Reward: "reward",
}
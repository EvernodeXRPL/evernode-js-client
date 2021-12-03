const XrplApiEvents = {
    LEDGER: 'ledger',
    PAYMENT: 'payment',
    CHECK_CREATE: 'checkcreate'
}

const XrplConstants = {
    MAX_LEDGER_OFFSET: 10,
    XRP: 'XRP',
    MIN_XRP_AMOUNT: '1' // drops
}

module.exports = {
    XrplApiEvents,
    XrplConstants
}
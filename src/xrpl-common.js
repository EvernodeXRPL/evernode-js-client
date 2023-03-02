const XrplApiEvents = {
    LEDGER: 'ledger',
    PAYMENT: 'payment',
    NFT_OFFER_CREATE: 'nftokencreateoffer',
    NFT_OFFER_ACCEPT: 'nftokenacceptoffer',
    URI_TOKEN_CREATE_SELL_OFFER: 'uritokencreateselloffer', // For Transfers
    URI_TOKEN_BUY: 'uritokenbuy' // For Acquires
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
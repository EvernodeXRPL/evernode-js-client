const XrplApiEvents = {
    LEDGER: 'ledger',
    DISCONNECTED: 'disconnected',
    PAYMENT: 'payment',
    NFT_OFFER_CREATE: 'nftokencreateoffer',
    NFT_OFFER_ACCEPT: 'nftokenacceptoffer',
    URI_TOKEN_CREATE_SELL_OFFER: 'uritokencreateselloffer', // For Transfers
    URI_TOKEN_BUY: 'uritokenbuy', // For Acquires
    SERVER_DESYNCED: 'desynced'
}

const XrplConstants = {
    MAX_LEDGER_OFFSET: 10,
    XRP: 'XRP',
    XAH: 'XAH',
    MIN_XRP_AMOUNT: '1', // drops - deprecated
    MIN_DROPS: '1'
}

const XrplTransactionTypes = {
    INVOKE: 'Invoke',
    PAYMENT: 'Payment',
    SIGNER_LIST_SET: 'SignerListSet',
    TRUST_SET: 'TrustSet',
    CHECK_CASH: 'CheckCash',
    ACCOUNT_SET: 'AccountSet',
    SET_REGULAR_KEY: 'SetRegularKey',
    OFFER_CREATE: 'OfferCreate',
    OFFER_CANCEL: 'OfferCancel',
    URI_TOKEN_MINT: 'URITokenMint',
    URI_TOKEN_BURN: 'URITokenBurn',
    URI_TOKEN_CREATE_SELL_OFFER: 'URITokenCreateSellOffer',
    URI_TOKEN_BUY_OFFER: 'URITokenBuy',
    URI_TOKEN_CANCEL_SELL_OFFER: 'URITokenCancelSellOffer',
    NF_TOKEN_MINT: 'NFTokenMint',
    NF_TOKEN_CREATE_OFFER: 'NFTokenCreateOffer',
    NF_TOKEN_ACCEPT_OFFER: 'NFTokenAcceptOffer',
    NF_TOKEN_BURN: 'NFTokenBurn'
}

module.exports = {
    XrplApiEvents,
    XrplConstants,
    XrplTransactionTypes
}
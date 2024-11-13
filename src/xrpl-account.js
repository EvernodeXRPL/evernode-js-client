const xrpl = require('xrpl');
const codec = require('ripple-address-codec');
const crypto = require("crypto");
const { XrplConstants, XrplTransactionTypes } = require('./xrpl-common');
const { TransactionHelper } = require('./transaction-helper');
const { EventEmitter } = require('./event-emitter');
const { Defaults } = require('./defaults');
const { UtilHelpers } = require('./util-helpers');

/**
 * Represents an XRP Ledger account and provides methods for account management.
 */
class XrplAccount {

    #events = new EventEmitter();
    #subscribed = false;
    #txStreamHandler;

    /**
    * Constructs an XrplAccount instance.
    * @param {string|null} address - The account address (optional).
    * @param {string|null} secret - The secret key (optional).
    * @param {Object} options - Additional options (optional).
    */
    constructor(address = null, secret = null, options = {}) {
        if (!address && !secret)
            throw "Both address and secret cannot be empty";

        this.address = address;
        this.secret = secret;
        this.xrplApi = options.xrplApi || Defaults.values.xrplApi;

        if (!this.xrplApi)
            throw "XrplAccount: xrplApi not specified.";

        if (!this.address && this.secret) {
            this.wallet = xrpl.Wallet.fromSeed(this.secret);
            this.address = this.wallet.classicAddress;
        } else if (this.secret) {
            const keypair = UtilHelpers.deriveKeypair(this.secret);
            const derivedPubKeyAddress = UtilHelpers.deriveAddress(keypair.publicKey);
            if (this.address == derivedPubKeyAddress)
                this.wallet = xrpl.Wallet.fromSeed(this.secret);
            else
                this.wallet = xrpl.Wallet.fromSeed(this.secret, { masterAddress: this.address });
        }

        this.#txStreamHandler = (eventName, tx, error) => {
            this.#events.emit(eventName, tx, error);
        };
    }

    /**
    * Adds an event listener for the specified event.
    * @param {string} event - The name of the event.
    * @param {Function} handler - The event handler function.
    */
    on(event, handler) {
        this.#events.on(event, handler);
    }

    /**
    * Adds a one-time event listener for the specified event.
    * @param {string} event - The name of the event.
    * @param {Function} handler - The event handler function.
    */
    once(event, handler) {
        this.#events.once(event, handler);
    }

    /**
     * Removes an event listener for the specified event.
     * @param {string} event - The name of the event.
     * @param {Function|null} handler - The event handler function (optional).
     */
    off(event, handler = null) {
        this.#events.off(event, handler);
    }

    /**
     * Derives the keypair from the account secret.
     * @throws Will throw an error if the account secret is empty.
     * @returns {Object} The derived keypair.
     */
    deriveKeypair() {
        if (!this.secret)
            throw 'Cannot derive key pair: Account secret is empty.';

        return UtilHelpers.deriveKeypair(this.secret);
    }


    /**
     * Checks if the account exists.
     * @returns {Promise<boolean>} True if the account exists, otherwise false.
     */
    async exists() {
        return await this.xrplApi.isAccountExists(this.address);
    }

    /**
     * Retrieves account information.
     * @returns {Promise<Object>} The account information.
     */
    async getInfo() {
        return await this.xrplApi.getAccountInfo(this.address);
    }

    /**
     * Gets the account's sequence number.
     * @returns {Promise<number>} The account's sequence number.
     */
    async getSequence() {
        return (await this.getInfo())?.Sequence;
    }

    /**
     * Retrieves the number of NFTs minted by the account.
     * @returns {Promise<number>} The number of minted NFTs.
     */
    async getMintedNFTokens() {
        return ((await this.getInfo())?.MintedNFTokens || 0);
    }

    /**
     * Retrieves the number of NFTs burned by the account.
     * @returns {number} The number of burned NFTs.
     */
    async getBurnedNFTokens() {
        return ((await this.getInfo())?.BurnedNFTokens || 0);
    }

    /**
     * Retrieves the account's message key.
     * @returns {Promise<string|null>} The message key or null if not set.
     */
    async getMessageKey() {
        return (await this.getInfo())?.MessageKey;
    }

    /**
 * Retrieves the wallet locator from the account info.
 * @returns {Promise<string|null>} The wallet locator or null if not found.
 */
    async getWalletLocator() {
        return (await this.getInfo())?.WalletLocator;
    }


    /**
     * Retrieves the domain from the account info and converts it from hex to ASCII.
     * @returns {Promise<string|null>} The domain as ASCII or null if not found.
     */
    async getDomain() {
        const domain = (await this.getInfo())?.Domain;
        return domain ? TransactionHelper.hexToASCII(domain) : null;
    }

    /**
     * Retrieves the trust lines for the account, filtered by currency and issuer.
     * @param {string} [currency] The currency to filter by.
     * @param {string} issuer The issuer of the trust lines.
     * @returns {Promise<Array<Object>>} The list of trust lines, filtered if a currency is specified.
     */
    async getTrustLines(currency, issuer) {
        const lines = await this.xrplApi.getTrustlines(this.address, {
            peer: issuer
        });
        return currency ? lines.filter(l => l.currency === currency) : lines;
    }

    /**
     * Retrieves the checks for the specified account.
     * @param {string} fromAccount The account from which to retrieve checks.
     * @returns {Promise<Array<Object>>} The list of checks.
     */
    async getChecks(fromAccount) {
        return await this.xrplApi.getAccountObjects(fromAccount, { type: "check" });
    }

    /**
     * Retrieves the NFTs for the account.
     * @returns {Promise<Array<Object>>} The list of NFTs.
     */
    async getNfts() {
        return await this.xrplApi.getNfts(this.address, {
            limit: 399
        });
    }

    /**
     * Retrieves the offers for the account.
     * @returns {Promise<Array<Object>>} The list of offers.
     */
    async getOffers() {
        return await this.xrplApi.getOffers(this.address);
    }

    /**
     * Retrieves the NFT offers for the account.
     * @returns {Promise<Array<Object>>} The list of NFT offers.
     */
    async getNftOffers() {
        return await this.xrplApi.getNftOffers(this.address);
    }

    /**
     * Retrieves a specific NFT by its URI.
     * @param {string} uri The URI of the NFT to retrieve.
     * @param {boolean} [isHexUri=false] Whether the URI is in hexadecimal format.
     * @returns {Promise<Object|null>} The NFT object or null if not found.
     */
    async getNftByUri(uri, isHexUri = false) {
        const nfts = await this.getNfts();
        const hexUri = isHexUri ? uri : TransactionHelper.asciiToHex(uri).toUpperCase();
        return nfts.find(n => n.URI == hexUri);
    }

    /**
     * Retrieves account objects for the account with the specified options.
     * @param {Object} options The options for retrieving account objects.
     * @returns {Promise<Array<Object>>} The list of account objects.
     */
    async getAccountObjects(options) {
        return await this.xrplApi.getAccountObjects(this.address, options);
    }

    /**
     * Retrieves namespace entries for the account.
     * @param {string} namespaceId The ID of the namespace to retrieve entries for.
     * @param {Object} [options={}] The options for retrieving namespace entries.
     * @returns {Promise<Array<Object>>} The list of namespace entries.
     */
    async getNamespaceEntries(namespaceId, options = {}) {
        return await this.xrplApi.getNamespaceEntries(this.address, namespaceId, options);
    }

    /**
     * Retrieves the flags set on the account.
     * @returns {Promise<Object>} The account flags.
     */
    async getFlags() {
        return xrpl.parseAccountRootFlags((await this.getInfo()).Flags);
    }

    /**
     * Retrieves account transactions within a specified ledger range.
     * @param {number} [minLedgerIndex=-1] The minimum ledger index to retrieve transactions from.
     * @param {number} [maxLedgerIndex=-1] The maximum ledger index to retrieve transactions from.
     * @param {boolean} [isForward=true] Whether to retrieve transactions in forward order.
     * @returns {Promise<Array>} The list of transactions.
     */
    async getAccountTrx(minLedgerIndex = -1, maxLedgerIndex = -1, isForward = true) {
        return await this.xrplApi.getAccountTrx(this.address, { ledger_index_min: minLedgerIndex, ledger_index_max: maxLedgerIndex, forward: isForward });
    }

    /**
     * Checks if the current wallet has a valid key pair for the account.
     * @returns {Promise<boolean>} True if the key pair is valid, otherwise false.
     */
    async hasValidKeyPair() {
        return await this.xrplApi.isValidKeyForAddress(this.wallet.publicKey, this.address);
    }

    /**
     * Sets account fields.
     * @param {Object} fields - The fields to set.
     * @param {Object} options - Additional transaction options (optional).
     * @returns {Promise<Object>} The transaction result.
     */
    async setAccountFields(fields, options = {}) {
        const preparedTxn = await this.prepareSetAccountFields(fields, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

    /**
     * Prepares an AccountSet transaction with the specified fields and options.
     * @param {Object} fields The fields to set for the account. 
     * Example: { Domain: "www.mydomain.com", Flags: { asfDefaultRipple: false, asfDisableMaster: true } }
     * @param {Object} [options={}] Additional options for the transaction. Can include hook parameters.
     * @throws Will throw an error if no fields are provided and `allowEmptyAccountSet` is not true.
     * @returns {Promise<Object>} The prepared AccountSet transaction.
     */
    async prepareSetAccountFields(fields, options = {}) {
        /**
         * Example for fields
         * 
         * fields = {
         *  Domain : "www.mydomain.com",
         *  Flags : { asfDefaultRipple: false, asfDisableMaster: true } 
         * }
         * 
         */

        if (!options?.allowEmptyAccountSet && Object.keys(fields ?? {}).length === 0)
            throw "AccountSet fields cannot be empty.";

        delete options?.allowEmptyAccountSet;

        const tx = {
            TransactionType: XrplTransactionTypes.ACCOUNT_SET,
            Account: this.address,
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        };

        for (const [key, value] of Object.entries(fields ?? {})) {

            switch (key) {
                case 'Domain':
                    tx.Domain = TransactionHelper.asciiToHex(value).toUpperCase();
                    break;

                case 'Flags':
                    for (const [flagKey, flagValue] of Object.entries(value)) {
                        tx[(flagValue) ? 'SetFlag' : 'ClearFlag'] |= xrpl.AccountSetAsfFlags[flagKey];
                    }
                    break;

                default:
                    tx[key] = value;
                    break;
            }
        }

        return await this.#prepareSubmissionTransaction(tx, options);
    }

    /**
     * Sets the signer list for the account.
     * @param {Array} signerList The list of signers to set for the account.
     * @param {Object} [options={}] Additional options for setting the signer list.
     * @returns {Promise<Object>} The result of the sign and submit operation.
     */
    async setSignerList(signerList = [], options = {}) {

        const preparedTxn = await this.prepareSetSignerList(signerList, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

    /**
     * Set the signer list to the account. Setting signerQuorum = 0 in options, will remove the signerlist from the account.
     * @param {*} signerList (optional) An array of signers. Ex:  [ {account:"ras24cvffvfbvfbbt5or4332", weight: 1}, {}, ...]
     * @param {*} options  Ex:  {signerQuorum: 1, sequence: 6543233}
     * @returns {Promise<Object>} Prepared transaction.
     */
    async prepareSetSignerList(signerList = [], options = {}) {
        if (options.signerQuorum < 0)
            throw ("Everpocket: quorum can't be less than zero.");

        if (options.signerQuorum > 0 && signerList.length >= 0) {
            let totalWeight = 0;
            for (const signer of signerList) {
                if (!(signer.account && signer.account.length > 0 && signer.weight && signer.weight > 0))
                    throw ("Everpocket: Signer list is invalid");
                totalWeight += signerList.weight;
            }
            if (totalWeight < options.signerQuorum)
                throw ("Everpocket: Total weight is less than the quorum");
        }

        signerList = signerList.sort((a, b) => a.account < b.account ? -1 : 1);

        const signerListTx =
        {
            Flags: 0,
            TransactionType: XrplTransactionTypes.SIGNER_LIST_SET,
            Account: this.address,
            SignerQuorum: options.signerQuorum,
            SignerEntries: [
                ...signerList.map(signer => ({
                    SignerEntry: {
                        Account: signer.account,
                        SignerWeight: signer.weight
                    }
                }))
            ]
        };
        return await this.#prepareSubmissionTransaction(signerListTx, options);
    }

    /**
     * Invokes a transaction to a specified address.
     * @param {string} toAddr The destination address.
     * @param {Object|null} [blobObj=null] Optional blob object with data and its format.
     * @param {Object} [options={}] Additional options for the transaction.
     * @returns {Promise<Object>} The result of the sign and submit operation.
     */
    async invoke(toAddr, blobObj = null, options = {}) {
        const preparedTxn = await this.prepareInvoke(toAddr, blobObj, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares an invoke transaction.
 * @param {string} toAddr The destination address.
 * @param {Object|null} [blobObj=null] Blob object containing data and whether it's in hex.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared invoke transaction.
 */
    async prepareInvoke(toAddr, blobObj = null, options = {}) {

        var txObj = {
            TransactionType: XrplTransactionTypes.INVOKE,
            Account: this.address,
            Destination: toAddr,
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        };

        if (blobObj) {
            txObj = {
                ...txObj,
                Blob: blobObj.isHex ? blobObj.data : TransactionHelper.asciiToHex(blobObj.data)
            }
        }

        return await this.#prepareSubmissionTransaction(txObj, options);
    }

/**
 * Makes a payment to the specified address.
 * @param {string} toAddr The destination address.
 * @param {number|string} amount The amount to send.
 * @param {string|null} [currency=null] Optional currency code.
 * @param {string|null} [issuer=null] Optional issuer for non-XRP currencies.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The result of the sign and submit operation.
 */
    async makePayment(toAddr, amount, currency = null, issuer = null, memos = null, options = {}) {
        const preparedTxn = await this.prepareMakePayment(toAddr, amount, currency, issuer, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares a payment transaction.
 * @param {string} toAddr The destination address.
 * @param {number|string} amount The amount to send.
 * @param {string|null} [currency=null] Optional currency code.
 * @param {string|null} [issuer=null] Optional issuer for non-XRP currencies.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared payment transaction.
 */
    async prepareMakePayment(toAddr, amount, currency = null, issuer = null, memos = null, options = {}) {

        const amountObj = makeAmountObject(amount, currency, issuer);

        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.PAYMENT,
            Account: this.address,
            Amount: amountObj,
            Destination: toAddr,
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }

/**
 * Sets a trust line with the specified parameters.
 * @param {string} currency The currency code for the trust line.
 * @param {string} issuer The issuer of the currency.
 * @param {string} limit The limit for the trust line.
 * @param {boolean} [allowRippling=false] Whether to allow rippling.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The result of the sign and submit operation.
 */
    async setTrustLine(currency, issuer, limit, allowRippling = false, memos = null, options = {}) {
        const preparedTxn = await this.prepareSetTrustLine(currency, issuer, limit, allowRippling, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares a trust line transaction.
 * @param {string} currency The currency code for the trust line.
 * @param {string} issuer The issuer of the currency.
 * @param {string} limit The limit for the trust line.
 * @param {boolean} [allowRippling=false] Whether to allow rippling.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared trust line transaction.
 */
    async prepareSetTrustLine(currency, issuer, limit, allowRippling = false, memos = null, options = {}) {

        if (typeof limit !== 'string')
            throw "Limit must be a string.";

        let tx = {
            TransactionType: XrplTransactionTypes.TRUST_SET,
            Account: this.address,
            LimitAmount: {
                currency: currency,
                issuer: issuer,
                value: limit
            },
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        };

        if (!allowRippling)
            tx.Flags = 131072; // tfSetNoRipple;

        return await this.#prepareSubmissionTransaction(tx, options);
    }

/**
 * Sets the regular key for the account.
 * @param {string} regularKey The regular key to set.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The result of the sign and submit operation.
 */
    async setRegularKey(regularKey, memos = null, options = {}) {
        const preparedTxn = await this.prepareSetRegularKey(regularKey, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares a transaction to set the regular key for the account.
 * @param {string} regularKey The regular key to set.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared regular key transaction.
 */
    async prepareSetRegularKey(regularKey, memos = null, options = {}) {

        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.SET_REGULAR_KEY,
            Account: this.address,
            RegularKey: regularKey,
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }

    async cashCheck(check, options = {}) {
        const preparedTxn = await this.prepareCashCheck(check, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Cashes a check for the account.
 * @param {Object} check The check object with details.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The result of the sign and submit operation.
 */
    async prepareCashCheck(check, options = {}) {
        const checkIDhasher = crypto.createHash('sha512')
        checkIDhasher.update(Buffer.from('0043', 'hex'))
        checkIDhasher.update(Buffer.from(codec.decodeAccountID(check.Account)))
        const seqBuf = Buffer.alloc(4)
        seqBuf.writeUInt32BE(check.Sequence, 0)
        checkIDhasher.update(seqBuf)
        const checkID = checkIDhasher.digest('hex').slice(0, 64).toUpperCase()
        console.log("Calculated checkID:", checkID);

        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.CHECK_CASH,
            Account: this.address,
            CheckID: checkID,
            Amount: {
                currency: check.SendMax.currency,
                issuer: check.SendMax.issuer,
                value: check.SendMax.value
            },
        }, options);
    }

/**
 * Creates an offer to sell assets.
 * @param {number|string} sellAmount The amount to sell.
 * @param {string} sellCurrency The currency code of the asset to sell.
 * @param {string} sellIssuer The issuer of the asset to sell.
 * @param {number|string} forAmount The amount to receive.
 * @param {string} forCurrency The currency code of the asset to receive.
 * @param {string|null} [forIssuer=null] The issuer of the asset to receive.
 * @param {number} [expiration=4294967295] The expiration time for the offer.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The result of the sign and submit operation.
 */
    async offerSell(sellAmount, sellCurrency, sellIssuer, forAmount, forCurrency, forIssuer = null, expiration = 4294967295, memos = null, options = {}) {
        const preparedTxn = await this.prepareOfferSell(sellAmount, sellCurrency, sellIssuer, forAmount, forCurrency, forIssuer, expiration, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }


/**
 * Prepares a transaction to sell assets.
 * @param {number|string} sellAmount The amount to sell.
 * @param {string} sellCurrency The currency code of the asset to sell.
 * @param {string} sellIssuer The issuer of the asset to sell.
 * @param {number|string} forAmount The amount to receive.
 * @param {string} forCurrency The currency code of the asset to receive.
 * @param {string|null} [forIssuer=null] The issuer of the asset to receive.
 * @param {number} [expiration=4294967295] The expiration time for the offer.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared offer sell transaction.
 */
    async prepareOfferSell(sellAmount, sellCurrency, sellIssuer, forAmount, forCurrency, forIssuer = null, expiration = 4294967295, memos = null, options = {}) {

        const sellAmountObj = makeAmountObject(sellAmount, sellCurrency, sellIssuer);
        const forAmountObj = makeAmountObject(forAmount, forCurrency, forIssuer);

        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.OFFER_CREATE,
            Account: this.address,
            TakerGets: sellAmountObj,
            TakerPays: forAmountObj,
            Expiration: expiration,
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }

/**
 * Creates an offer to buy assets.
 * @param {number|string} buyAmount The amount to buy.
 * @param {string} buyCurrency The currency code of the asset to buy.
 * @param {string} buyIssuer The issuer of the asset to buy.
 * @param {number|string} forAmount The amount to give in exchange.
 * @param {string} forCurrency The currency code of the asset to give in exchange.
 * @param {string|null} [forIssuer=null] The issuer of the asset to give in exchange.
 * @param {number} [expiration=4294967295] The expiration time for the offer.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The result of the sign and submit operation.
 */
    async offerBuy(buyAmount, buyCurrency, buyIssuer, forAmount, forCurrency, forIssuer = null, expiration = 4294967295, memos = null, options = {}) {
        const preparedTxn = await this.prepareOfferBuy(buyAmount, buyCurrency, buyIssuer, forAmount, forCurrency, forIssuer, expiration, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares an offer to buy assets.
 * @param {number|string} buyAmount The amount to buy.
 * @param {string} buyCurrency The currency code of the asset to buy.
 * @param {string} buyIssuer The issuer of the asset to buy.
 * @param {number|string} forAmount The amount to give in exchange.
 * @param {string} forCurrency The currency code of the asset to give in exchange.
 * @param {string|null} [forIssuer=null] The issuer of the asset to give in exchange.
 * @param {number} [expiration=4294967295] The expiration time for the offer.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared offer buy transaction.
 */
    async prepareOfferBuy(buyAmount, buyCurrency, buyIssuer, forAmount, forCurrency, forIssuer = null, expiration = 4294967295, memos = null, options = {}) {

        const buyAmountObj = makeAmountObject(buyAmount, buyCurrency, buyIssuer);
        const forAmountObj = makeAmountObject(forAmount, forCurrency, forIssuer);

        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.OFFER_CREATE,
            Account: this.address,
            TakerGets: forAmountObj,
            TakerPays: buyAmountObj,
            Expiration: expiration,
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }

/**
 * Cancels an existing offer.
 * @param {number} offerSequence The sequence number of the offer to cancel.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The result of the sign and submit operation.
 */
    async cancelOffer(offerSequence, memos = null, options = {}) {
        const preparedTxn = await this.prepareCancelOffer(offerSequence, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares a transaction to cancel an offer.
 * @param {number} offerSequence The sequence number of the offer to cancel.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared offer cancel transaction.
 */
    async prepareCancelOffer(offerSequence, memos = null, options = {}) {
        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.OFFER_CANCEL,
            Account: this.address,
            OfferSequence: offerSequence,
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }

    async mintNft(uri, taxon, transferFee, flags = {}, memos = null, options = {}) {
        const preparedTxn = await this.prepareMintNft(uri, taxon, transferFee, flags, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

    async prepareMintNft(uri, taxon, transferFee, flags = {}, memos = null, options = {}) {
        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.NF_TOKEN_MINT,
            Account: this.address,
            URI: flags.isHexUri ? uri : TransactionHelper.asciiToHex(uri).toUpperCase(),
            NFTokenTaxon: taxon,
            TransferFee: transferFee,
            Flags: (flags.isBurnable ? 1 : 0) | (flags.isOnlyXRP ? 2 : 0) | (flags.isTrustLine ? 4 : 0) | (flags.isTransferable ? 8 : 0),
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }

    async offerSellNft(nfTokenId, amount, currency, issuer = null, destination = null, expiration = 4294967295, memos = null, options = {}) {
        const preparedTxn = await this.prepareOfferSellNft(nfTokenId, amount, currency, issuer, destination, expiration, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

    async prepareOfferSellNft(nfTokenId, amount, currency, issuer = null, destination = null, expiration = 4294967295, memos = null, options = {}) {

        const amountObj = makeAmountObject(amount, currency, issuer);
        const tx = {
            TransactionType: XrplTransactionTypes.NF_TOKEN_CREATE_OFFER,
            Account: this.address,
            NFTokenID: nfTokenId,
            Amount: amountObj,
            Expiration: expiration,
            Flags: 1, // tfSellToken
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        };

        return await this.#prepareSubmissionTransaction(destination ? { ...tx, Destination: destination } : tx, options);
    }

    async offerBuyNft(nfTokenId, owner, amount, currency, issuer = null, expiration = 4294967295, memos = null, options = {}) {
        const preparedTxn = await this.prepareOfferSellNft(nfTokenId, owner, amount, currency, issuer, expiration, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

    async prepareOfferBuyNft(nfTokenId, owner, amount, currency, issuer = null, expiration = 4294967295, memos = null, options = {}) {

        const amountObj = makeAmountObject(amount, currency, issuer);

        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.NF_TOKEN_CREATE_OFFER,
            Account: this.address,
            NFTokenID: nfTokenId,
            Owner: owner,
            Amount: amountObj,
            Expiration: expiration,
            Flags: 0, // Buy offer
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }


    async sellNft(offerId, memos = null, options = {}) {
        const preparedTxn = await this.prepareSellNft(offerId, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

    async prepareSellNft(offerId, memos = null, options = {}) {

        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.NF_TOKEN_ACCEPT_OFFER,
            Account: this.address,
            NFTokenBuyOffer: offerId,
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }

    async buyNft(offerId, memos = null, options = {}) {
        const preparedTxn = await this.prepareBuyNft(offerId, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

    async prepareBuyNft(offerId, memos = null, options = {}) {

        return await this.#prepareSubmissionTransaction({
            TransactionType: XrplTransactionTypes.NF_TOKEN_ACCEPT_OFFER,
            Account: this.address,
            NFTokenSellOffer: offerId,
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        }, options);
    }

    async burnNft(nfTokenId, owner = null, memos = null, options = {}) {
        const preparedTxn = await this.prepareBurnNft(nfTokenId, owner, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

    async prepareBurnNft(nfTokenId, owner = null, memos = null, options = {}) {

        const tx = {
            TransactionType: XrplTransactionTypes.NF_TOKEN_ACCEPT_OFFER,
            Account: this.address,
            NFTokenID: nfTokenId,
            Memos: TransactionHelper.formatMemos(memos),
            HookParameters: TransactionHelper.formatHookParams(options.hookParams)
        };

        return await this.#prepareSubmissionTransaction(owner ? { ...tx, Owner: owner } : tx, options);
    }

    generateKeylet(type, data = {}) {
        switch (type) {
            case 'nftPage': {
                const accIdHex = (codec.decodeAccountID(this.address)).toString('hex').toUpperCase();
                const tokenPortion = data?.nfTokenId.substr(40, 64);
                return '0050' + accIdHex + tokenPortion;
            }

            case 'nftPageMax': {
                const accIdHex = (codec.decodeAccountID(this.address)).toString('hex').toUpperCase();
                return '0050' + accIdHex + 'F'.repeat(24);
            }

            case 'nftPageMin': {
                const accIdHex = (codec.decodeAccountID(this.address)).toString('hex').toUpperCase();
                return '0050' + accIdHex + '0'.repeat(24);
            }

            default:
                return null;
        }
    }

/**
 * Subscribes to the XRPL address stream for transaction updates.
 * Ensures only one subscription is active at a time.
 * @returns {Promise<void>}
 */
    async subscribe() {
        // Subscribe only once. Otherwise event handlers will be duplicated.
        if (this.#subscribed)
            return;

        await this.xrplApi.subscribeToAddress(this.address, this.#txStreamHandler);

        this.#subscribed = true;
    }

/**
 * Unsubscribes from the XRPL address stream.
 * @returns {Promise<void>}
 */
    async unsubscribe() {
        if (!this.#subscribed)
            return;

        await this.xrplApi.unsubscribeFromAddress(this.address, this.#txStreamHandler);
        this.#subscribed = false;
    }

/**
 * Submits a signed raw transaction.
 * @param {string} txBlob Signed and encoded transaction as a hex string.
 * @returns {Promise<Object>} Result of the transaction submission.
 */
    submitTransactionBlob(txBlob) {

        // Returned format.
        // {
        //     id: txHash, (if signing success)
        //     code: final transaction result code.
        //     details: submission and transaction details, (if signing success)
        //     error: Any error that prevents submission.
        // }

        return new Promise(async (resolve, reject) => {
            try {
                const submission = await this.xrplApi.submit(txBlob);
                const r = submission?.result;
                const txResult = {
                    id: r?.hash,
                    code: r?.meta?.TransactionResult,
                    details: r
                };

                console.log("Transaction result: " + txResult.code);
                const hookExecRes = txResult.details?.meta?.HookExecutions?.map(o => {
                    return {
                        result: o.HookExecution?.HookResult,
                        returnCode: parseInt(o.HookExecution?.HookReturnCode, 16),
                        message: TransactionHelper.hexToASCII(o.HookExecution?.HookReturnString).replace(/\x00+$/, '')
                    }
                });
                if (txResult.code === "tesSUCCESS")
                    resolve({ ...txResult, ...(hookExecRes ? { hookExecutionResult: hookExecRes } : {}) });
                else
                    reject({ ...txResult, ...(hookExecRes ? { hookExecutionResult: hookExecRes } : {}) });
            }
            catch (err) {
                console.log("Error submitting transaction:", err);
                reject({ error: err });
            }

        });
    }

/**
 * Signs the given transaction and returns the signed blob and its hash.
 * @param {Object} tx Transaction object.
 * @param {boolean} [isMultiSign=false] Whether the transaction is for multisigning.
 * @returns {Object} The signed transaction hash and blob. Format: {hash: string, tx_blob: string}
 */
    sign(tx, isMultiSign = false) {
        return this.xrplApi.xrplHelper.sign(tx, this.secret, isMultiSign)
    }

    // URIToken related methods

/**
 * Mints a URI token.
 * @param {string} uri The URI to mint as a token.
 * @param {string|null} [digest=null] The optional digest for the token.
 * @param {Object} [flags={}] Flags to control token properties (e.g., isBurnable).
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} Result of the mint transaction.
 */
    async mintURIToken(uri, digest = null, flags = {}, options = {}) {
        const preparedTxn = await this.prepareMintURIToken(uri, digest, flags, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares the minting of a URI token.
 * @param {string} uri The URI to mint as a token.
 * @param {string|null} [digest=null] The optional digest for the token.
 * @param {Object} [flags={}] Flags to control token properties.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared mint transaction.
 */
    async prepareMintURIToken(uri, digest = null, flags = {}, options = {}) {
        const tx = {
            Account: this.address,
            TransactionType: XrplTransactionTypes.URI_TOKEN_MINT,
            URI: flags.isHexUri ? uri : TransactionHelper.asciiToHex(uri).toUpperCase(),
            Flags: flags.isBurnable ? 1 : 0
        }

        if (digest)
            tx.Digest = digest;

        return await this.#prepareSubmissionTransaction(tx, options);
    }

/**
 * Burns a URI token.
 * @param {string} uriTokenID The ID of the URI token to burn.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} Result of the burn transaction.
 */
    async burnURIToken(uriTokenID, options = {}) {
        const preparedTxn = await this.prepareBurnURIToken(uriTokenID, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares the burning of a URI token.
 * @param {string} uriTokenID The ID of the URI token to burn.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared burn transaction.
 */
    async prepareBurnURIToken(uriTokenID, options = {}) {
        const tx = {
            Account: this.address,
            TransactionType: XrplTransactionTypes.URI_TOKEN_BURN,
            URITokenID: uriTokenID
        }
        return await this.#prepareSubmissionTransaction(tx, options);
    }

/**
 * Creates a sell offer for a URI token.
 * @param {string} uriTokenID The ID of the URI token to sell.
 * @param {string|number} amount The amount to sell the token for.
 * @param {string} currency The currency code for the sale.
 * @param {string|null} [issuer=null] The issuer of the currency.
 * @param {string|null} [toAddr=null] The address of the buyer.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} Result of the sell transaction.
 */
    async sellURIToken(uriTokenID, amount, currency, issuer = null, toAddr = null, memos = null, options = {}) {
        const preparedTxn = await this.prepareSellURIToken(uriTokenID, amount, currency, issuer, toAddr, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares a sell offer for a URI token.
 * @param {string} uriTokenID The ID of the URI token to sell.
 * @param {string|number} amount The amount to sell the token for.
 * @param {string} currency The currency code for the sale.
 * @param {string|null} [issuer=null] The issuer of the currency.
 * @param {string|null} [toAddr=null] The address of the buyer.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared sell offer transaction.
 */
    async prepareSellURIToken(uriTokenID, amount, currency, issuer = null, toAddr = null, memos = null, options = {}) {
        const amountObj = makeAmountObject(amount, currency, issuer);
        const tx = {
            Account: this.address,
            TransactionType: XrplTransactionTypes.URI_TOKEN_CREATE_SELL_OFFER,
            Amount: amountObj,
            URITokenID: uriTokenID
        };

        if (toAddr)
            tx.Destination = toAddr;

        if (memos)
            tx.Memos = TransactionHelper.formatMemos(memos);

        if (options.hookParams)
            tx.HookParameters = TransactionHelper.formatHookParams(options.hookParams);

        return await this.#prepareSubmissionTransaction(tx, options);
    }

/**
 * Buys a URI token.
 * @param {Object} uriToken The URI token object to buy.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} Result of the buy transaction.
 */
    async buyURIToken(uriToken, memos = null, options = {}) {
        const preparedTxn = await this.prepareBuyURIToken(uriToken, memos, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares a buy offer for a URI token.
 * @param {Object} uriToken The URI token object to buy.
 * @param {Array|null} [memos=null] Optional memos to attach to the transaction.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared buy offer transaction.
 */
    async prepareBuyURIToken(uriToken, memos = null, options = {}) {
        const tx = {
            Account: this.address,
            TransactionType: XrplTransactionTypes.URI_TOKEN_BUY_OFFER,
            Amount: uriToken.Amount,
            URITokenID: uriToken.index
        }

        if (memos)
            tx.Memos = TransactionHelper.formatMemos(memos);

        if (options.hookParams)
            tx.HookParameters = TransactionHelper.formatHookParams(options.hookParams);

        return await this.#prepareSubmissionTransaction(tx, options);
    }

/**
 * Clears a sell offer for a URI token.
 * @param {string} uriTokenID The ID of the URI token offer to clear.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} Result of the clear offer transaction.
 */
    async clearURITokenOffer(uriTokenID, options = {}) {
        const preparedTxn = await this.prepareClearURITokenOffer(uriTokenID, options);
        return await this.signAndSubmit(preparedTxn, options.submissionRef);
    }

/**
 * Prepares the clearing of a sell offer for a URI token.
 * @param {string} uriTokenID The ID of the URI token offer to clear.
 * @param {Object} [options={}] Additional options for the transaction.
 * @returns {Promise<Object>} The prepared clear offer transaction.
 */
    async prepareClearURITokenOffer(uriTokenID, options = {}) {
        return await this.#prepareSubmissionTransaction({
            Account: this.address,
            TransactionType: XrplTransactionTypes.URI_TOKEN_CANCEL_SELL_OFFER,
            URITokenID: uriTokenID
        }, options);
    }

/**
 * Retrieves all URI tokens associated with the account.
 * @param {Object} options Additional options for the retrieval.
 * @returns {Promise<Array>} List of URI tokens.
 */
    async getURITokens(options) {
        const obj = await this.getAccountObjects(options);
        return obj.filter(t => t.LedgerEntryType == 'URIToken');
    }

/**
 * Retrieves a URI token by its URI.
 * @param {string} uri The URI of the token to retrieve.
 * @param {boolean} [isHexUri=false] Whether the URI is in hex format.
 * @returns {Promise<Object>} The URI token object.
 */
    async getURITokenByUri(uri, isHexUri = false) {
        const index = this.generateIssuedURITokenId(uri, isHexUri);
        return await this.xrplApi.getURITokenByIndex(index);
    }

/**
 * Generates the issued URI token ID from a given URI.
 * @param {string} uri The URI to generate the token ID from.
 * @param {boolean} [isHexUri=false] Whether the URI is in hex format.
 * @returns {string} The generated URI token ID.
 */
    generateIssuedURITokenId(uri, isHexUri = false) {
        if (uri.length < 1 || uri.length > 256)
            throw 'Invalid URI';

        const URITOKEN_LEDGER_TYPE_PREFIX = 85; // Decimal value of ASCII 'U'
        const accIdHex = (codec.decodeAccountID(this.address)).toString('hex').toUpperCase();
        const uriHex = isHexUri ? uri : TransactionHelper.asciiToHex(uri).toUpperCase();

        let hash = crypto.createHash('sha512');

        const typeBuf = Buffer.alloc(2, 0);
        typeBuf.writeInt16BE(URITOKEN_LEDGER_TYPE_PREFIX);

        const dataBuf = Buffer.from(`${accIdHex}${uriHex}`, 'hex');

        let output = hash.update(typeBuf);
        output = hash.update(dataBuf);

        const digest = output.digest('hex');

        // Get the first 32 bytes of hash.
        return digest.substring(0, 64).toUpperCase();
    }


    /**
     * Prepare a transaction for submission. (Signing Free)
     * @param {object} tx Partially prepared transaction.
     * @param {*} options Options regarding to the transaction submission.
     * @returns {Promise<Object>} Submission transaction.
     */
    async #prepareSubmissionTransaction(tx, options) {
        // Attach tx options to the transaction.
        const txOptions = {
            LastLedgerSequence: options.maxLedgerIndex || (this.xrplApi.ledgerIndex + XrplConstants.MAX_LEDGER_OFFSET),
            Sequence: options.sequence || await this.getSequence(),
            SigningPubKey: '', // This field is required for fee calculation.
            Fee: '0', // This field is required for fee calculation.
            NetworkID: Defaults.values.networkID
        }

        if (options?.Flags)
            txOptions.Flags = options.Flags;

        Object.assign(tx, txOptions);
        const txnBlob = this.xrplApi.xrplHelper.encode(tx);
        const fees = options.fee || (options.feeUplift ? (`${options.feeUplift + Number(await this.xrplApi.getTransactionFee(txnBlob))}`) : await this.xrplApi.getTransactionFee(txnBlob));
        delete tx['SigningPubKey'];
        tx.Fee = fees + '';
        return tx;
    }

    /**
     * Sign and submit prepared transaction.
     * @param {object} preparedTransaction Prepared transaction.
     * @param {object} submissionRef [Optional] Reference object to take submission references.
     * @returns {Promise<Object>} result of the submitted transaction.
     */
    async signAndSubmit(preparedTransaction, submissionRef = {}) {
        const signedTxn = this.sign(preparedTransaction, false);
        return await this.xrplApi.submitAndWait(preparedTransaction, signedTxn.tx_blob, submissionRef);
    }

    /**
     * Submit a multi-singed transaction.
     * @param {object} tx Signed transaction.
     * @returns {Promise<Object>} Result of the transaction.
     */
    async submitMultisigned(tx) {
        return await this.xrplApi.submitMultisigned(tx)
    }
}

function makeAmountObject(amount, currency = null, issuer = null) {
    if (typeof amount !== 'string')
        throw "Amount must be a string.";

    const amountObj = !issuer ? amount : {
        currency: currency,
        issuer: issuer,
        value: amount
    }
    return amountObj;
}

module.exports = {
    XrplAccount
}

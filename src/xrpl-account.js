const xrpl = require('xrpl');
const kp = require('ripple-keypairs');
const codec = require('ripple-address-codec');
const crypto = require("crypto");
const { XrplConstants } = require('./xrpl-common');
const { TransactionHelper } = require('./transaction-helper');
const { EventEmitter } = require('./event-emitter');
const { DefaultValues } = require('./defaults');
const xrplCodec = require('xrpl-binary-codec');
const { EvernodeConstants } = require('./evernode-common');

class XrplAccount {

    #events = new EventEmitter();
    #subscribed = false;
    #txStreamHandler;

    constructor(address = null, secret = null, options = {}) {
        if (!address && !secret)
            throw "Both address and secret cannot be empty";

        this.address = address;
        this.secret = secret;
        this.xrplApi = options.xrplApi || DefaultValues.xrplApi;

        if (!this.xrplApi)
            throw "XrplAccount: xrplApi not specified.";

        if (!this.address && this.secret) {
            this.wallet = xrpl.Wallet.fromSeed(this.secret);
            this.address = this.wallet.classicAddress;
        } else if (this.secret) {
            const keypair = kp.deriveKeypair(this.secret);
            const derivedPubKeyAddress = kp.deriveAddress(keypair.publicKey);
            if (this.address == derivedPubKeyAddress)
                this.wallet = xrpl.Wallet.fromSeed(this.secret);
            else
                this.wallet = xrpl.Wallet.fromSeed(this.secret, { masterAddress: this.address });
        }

        this.#txStreamHandler = (eventName, tx, error) => {
            this.#events.emit(eventName, tx, error);
        };
    }

    on(event, handler) {
        this.#events.on(event, handler);
    }

    once(event, handler) {
        this.#events.once(event, handler);
    }

    off(event, handler = null) {
        this.#events.off(event, handler);
    }

    deriveKeypair() {
        if (!this.secret)
            throw 'Cannot derive key pair: Account secret is empty.';

        return kp.deriveKeypair(this.secret);
    }

    async exists() {
        return await this.xrplApi.isAccountExists(this.address);
    }

    async getInfo() {
        return await this.xrplApi.getAccountInfo(this.address);
    }

    async getSequence() {
        return (await this.getInfo())?.Sequence;
    }

    async getMintedNFTokens() {
        return ((await this.getInfo())?.MintedNFTokens || 0);
    }

    async getBurnedNFTokens() {
        return ((await this.getInfo())?.BurnedNFTokens || 0);
    }

    async getMessageKey() {
        return (await this.getInfo())?.MessageKey;
    }

    async getDomain() {
        const domain = (await this.getInfo())?.Domain;
        return domain ? TransactionHelper.hexToASCII(domain) : null;
    }

    async getTrustLines(currency, issuer) {
        const lines = await this.xrplApi.getTrustlines(this.address, {
            limit: 399,
            peer: issuer
        });
        return currency ? lines.filter(l => l.currency === currency) : lines;
    }

    async getChecks(fromAccount) {
        return await this.xrplApi.getAccountObjects(fromAccount, { type: "check" });
    }

    async getNfts() {
        return await this.xrplApi.getNfts(this.address, {
            limit: 399
        });
    }

    async getOffers() {
        return await this.xrplApi.getOffers(this.address);
    }

    async getNftOffers() {
        return await this.xrplApi.getNftOffers(this.address);
    }

    async getNftByUri(uri, isHexUri = false) {
        const nfts = await this.getNfts();
        const hexUri = isHexUri ? uri : TransactionHelper.asciiToHex(uri).toUpperCase();
        return nfts.find(n => n.URI == hexUri);
    }

    async getAccountObjects(options) {
        return await this.xrplApi.getAccountObjects(this.address, options);
    }

    async getNamespaceEntries(namespaceId, options = {}) {
        return await this.xrplApi.getNamespaceEntries(this.address, namespaceId, options);
    }

    async getFlags() {
        return xrpl.parseAccountRootFlags((await this.getInfo()).Flags);
    }

    async getAccountTrx(minLedgerIndex = -1, maxLedgerIndex = -1, isForward = true) {
        return await this.xrplApi.getAccountTrx(this.address, { ledger_index_min: minLedgerIndex, ledger_index_max: maxLedgerIndex, forward: isForward });
    }

    async hasValidKeyPair() {
        return await this.xrplApi.isValidKeyForAddress(this.wallet.publicKey, this.address);
    }

    setAccountFields(fields, options = {}) {
        /**
         * Example for fields
         * 
         * fields = {
         *  Domain : "www.mydomain.com",
         *  Flags : { asfDefaultRipple: false, asfDisableMaster: true } 
         * }
         * 
         */

        if (Object.keys(fields).length === 0)
            throw "AccountSet fields cannot be empty.";

        const tx = {
            TransactionType: 'AccountSet',
            Account: this.address
        };

        for (const [key, value] of Object.entries(fields)) {

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

        return this.#submitAndVerifyTransaction(tx, options);
    }

    /**
     * Set the signer list to the account. Setting signerQuorum = 0 in options, will remove the signerlist from the account.
     * @param {*} signerList (optional) An array of signers. Ex:  [ {account:"ras24cvffvfbvfbbt5or4332", weight: 1}, {}, ...]
     * @param {*} options  Ex:  {signerQuorum: 1, sequence: 6543233}
     * @returns a promise
     */
    setSignerList(signerList = [], options = {}) {
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

        const signerListTx =
        {
            Flags: 0,
            TransactionType: "SignerListSet",
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
        return this.#submitAndVerifyTransaction(signerListTx, options);
    }

    makePayment(toAddr, amount, currency, issuer = null, memos = null, options = {}) {

        const amountObj = makeAmountObject(amount, currency, issuer);

        return this.#submitAndVerifyTransaction({
            TransactionType: 'Payment',
            Account: this.address,
            Amount: amountObj,
            Destination: toAddr,
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    setTrustLine(currency, issuer, limit, allowRippling = false, memos = null, options = {}) {

        if (typeof limit !== 'string')
            throw "Limit must be a string.";

        let tx = {
            TransactionType: 'TrustSet',
            Account: this.address,
            LimitAmount: {
                currency: currency,
                issuer: issuer,
                value: limit
            },
            Memos: TransactionHelper.formatMemos(memos)
        };

        if (!allowRippling)
            tx.Flags = 131072; // tfSetNoRipple;

        return this.#submitAndVerifyTransaction(tx, options);
    }

    setRegularKey(regularKey, memos = null, options = {}) {

        return this.#submitAndVerifyTransaction({
            TransactionType: 'SetRegularKey',
            Account: this.address,
            RegularKey: regularKey,
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    cashCheck(check, options = {}) {
        const checkIDhasher = crypto.createHash('sha512')
        checkIDhasher.update(Buffer.from('0043', 'hex'))
        checkIDhasher.update(Buffer.from(codec.decodeAccountID(check.Account)))
        const seqBuf = Buffer.alloc(4)
        seqBuf.writeUInt32BE(check.Sequence, 0)
        checkIDhasher.update(seqBuf)
        const checkID = checkIDhasher.digest('hex').slice(0, 64).toUpperCase()
        console.log("Calculated checkID:", checkID);

        return this.#submitAndVerifyTransaction({
            TransactionType: 'CheckCash',
            Account: this.address,
            CheckID: checkID,
            Amount: {
                currency: check.SendMax.currency,
                issuer: check.SendMax.issuer,
                value: check.SendMax.value
            },
        }, options);
    }

    offerSell(sellAmount, sellCurrency, sellIssuer, forAmount, forCurrency, forIssuer = null, expiration = 4294967295, memos = null, options = {}) {

        const sellAmountObj = makeAmountObject(sellAmount, sellCurrency, sellIssuer);
        const forAmountObj = makeAmountObject(forAmount, forCurrency, forIssuer);

        return this.#submitAndVerifyTransaction({
            TransactionType: 'OfferCreate',
            Account: this.address,
            TakerGets: sellAmountObj,
            TakerPays: forAmountObj,
            Expiration: expiration,
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    offerBuy(buyAmount, buyCurrency, buyIssuer, forAmount, forCurrency, forIssuer = null, expiration = 4294967295, memos = null, options = {}) {

        const buyAmountObj = makeAmountObject(buyAmount, buyCurrency, buyIssuer);
        const forAmountObj = makeAmountObject(forAmount, forCurrency, forIssuer);

        return this.#submitAndVerifyTransaction({
            TransactionType: 'OfferCreate',
            Account: this.address,
            TakerGets: forAmountObj,
            TakerPays: buyAmountObj,
            Expiration: expiration,
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    cancelOffer(offerSequence, memos = null, options = {}) {
        return this.#submitAndVerifyTransaction({
            TransactionType: 'OfferCancel',
            Account: this.address,
            OfferSequence: offerSequence,
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    mintNft(uri, taxon, transferFee, flags = {}, memos = null, options = {}) {
        return this.#submitAndVerifyTransaction({
            TransactionType: 'NFTokenMint',
            Account: this.address,
            URI: flags.isHexUri ? uri : TransactionHelper.asciiToHex(uri).toUpperCase(),
            NFTokenTaxon: taxon,
            TransferFee: transferFee,
            Flags: (flags.isBurnable ? 1 : 0) | (flags.isOnlyXRP ? 2 : 0) | (flags.isTrustLine ? 4 : 0) | (flags.isTransferable ? 8 : 0),
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    offerSellNft(nfTokenId, amount, currency, issuer = null, destination = null, expiration = 4294967295, memos = null, options = {}) {

        const amountObj = makeAmountObject(amount, currency, issuer);
        const tx = {
            TransactionType: 'NFTokenCreateOffer',
            Account: this.address,
            NFTokenID: nfTokenId,
            Amount: amountObj,
            Expiration: expiration,
            Flags: 1, // tfSellToken
            Memos: TransactionHelper.formatMemos(memos)
        };

        return this.#submitAndVerifyTransaction(destination ? { ...tx, Destination: destination } : tx, options);
    }

    offerBuyNft(nfTokenId, owner, amount, currency, issuer = null, expiration = 4294967295, memos = null, options = {}) {

        const amountObj = makeAmountObject(amount, currency, issuer);

        return this.#submitAndVerifyTransaction({
            TransactionType: 'NFTokenCreateOffer',
            Account: this.address,
            NFTokenID: nfTokenId,
            Owner: owner,
            Amount: amountObj,
            Expiration: expiration,
            Flags: 0, // Buy offer
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    sellNft(offerId, memos = null, options = {}) {

        return this.#submitAndVerifyTransaction({
            TransactionType: 'NFTokenAcceptOffer',
            Account: this.address,
            NFTokenBuyOffer: offerId,
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    buyNft(offerId, memos = null, options = {}) {

        return this.#submitAndVerifyTransaction({
            TransactionType: 'NFTokenAcceptOffer',
            Account: this.address,
            NFTokenSellOffer: offerId,
            Memos: TransactionHelper.formatMemos(memos)
        }, options);
    }

    burnNft(nfTokenId, owner = null, memos = null, options = {}) {

        const tx = {
            TransactionType: 'NFTokenBurn',
            Account: this.address,
            NFTokenID: nfTokenId,
            Memos: TransactionHelper.formatMemos(memos)
        };

        return this.#submitAndVerifyTransaction(owner ? { ...tx, Owner: owner } : tx, options);
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

    async subscribe() {
        // Subscribe only once. Otherwise event handlers will be duplicated.
        if (this.#subscribed)
            return;

        await this.xrplApi.subscribeToAddress(this.address, this.#txStreamHandler);

        this.#subscribed = true;
    }

    async unsubscribe() {
        if (!this.#subscribed)
            return;

        await this.xrplApi.unsubscribeFromAddress(this.address, this.#txStreamHandler);
        this.#subscribed = false;
    }

    #submitAndVerifyTransaction(tx, options) {

        if (!this.wallet)
            throw "no_secret";

        // Returned format.
        // {
        //     id: txHash, (if signing success)
        //     code: final transaction result code.
        //     details: submission and transaction details, (if signing success)
        //     error: Any error that prevents submission.
        // }
        return new Promise(async (resolve, reject) => {

            // Attach tx options to the transaction.
            const txOptions = {
                LastLedgerSequence: options.maxLedgerIndex || (this.xrplApi.ledgerIndex + XrplConstants.MAX_LEDGER_OFFSET),
                Sequence: options.sequence || await this.getSequence(),
                SigningPubKey: '', // This field is required for fee calculation.
                Fee: '0', // This field is required for fee calculation.
                NetworkID: DefaultValues.networkID
            }
            Object.assign(tx, txOptions);
            const txnBlob = xrplCodec.encode(tx);
            const fees = await this.xrplApi.getTransactionFee(txnBlob);
            delete tx['SigningPubKey'];
            tx.Fee = fees + '';

            try {
                const submission = await this.xrplApi.submitAndVerify(tx, { wallet: this.wallet });
                const r = submission?.result;
                const txResult = {
                    id: r?.hash,
                    code: r?.meta?.TransactionResult,
                    details: r
                };

                console.log("Transaction result: " + txResult.code);
                if (txResult.code === "tesSUCCESS")
                    resolve(txResult);
                else
                    reject(txResult);
            }
            catch (err) {
                console.log("Error submitting transaction:", err);
                reject({ error: err });
            }

        });
    }

    /**
     * Submit the signed raw transaction.
     * @param txBlob Signed and encoded transacion as a hex string.
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
                const submission = await this.xrplApi.submitAndVerify(txBlob);
                const r = submission?.result;
                const txResult = {
                    id: r?.hash,
                    code: r?.meta?.TransactionResult,
                    details: r
                };

                console.log("Transaction result: " + txResult.code);
                if (txResult.code === "tesSUCCESS")
                    resolve(txResult);
                else
                    reject(txResult);
            }
            catch (err) {
                console.log("Error submitting transaction:", err);
                reject({ error: err });
            }

        });
    }

    /**
     * Sign the given transaction and returns the signed blob and its hash.
     * @param {object} tx Transaction object.
     * @param {boolean} isMultiSign Whether the transaction is for multisigning. Defaults to false.
     * @returns {hash: string, tx_blob: string}
     */
    sign(tx, isMultiSign = false) {
        return this.wallet.sign(tx, isMultiSign);
    }

    // URIToken related methods

    mintURIToken(uri, digest = null, flags = {}, options = {}) {
        const tx = {
            Account: this.address,
            TransactionType: "URITokenMint",
            URI: flags.isHexUri ? uri : TransactionHelper.asciiToHex(uri).toUpperCase(),
            Flags: flags.isBurnable ? 1 : 0
        }

        if (digest)
            tx.Digest = digest;

        return this.#submitAndVerifyTransaction(tx, options);
    }

    burnURIToken(uriTokenID, options = {}) {
        const tx = {
            Account: this.address,
            TransactionType: "URITokenBurn",
            URITokenID: uriTokenID
        }
        return this.#submitAndVerifyTransaction(tx, options);
    }

    sellURIToken(uriTokenID, amount, currency, issuer = null, toAddr = null, options = {}) {
        const amountObj = makeAmountObject(amount, currency, issuer);

        const tx = {
            Account: this.address,
            TransactionType: "URITokenCreateSellOffer",
            Amount: amountObj,
            URITokenID: uriTokenID
        };

        if (toAddr)
            tx.Destination = toAddr;

        return this.#submitAndVerifyTransaction(tx, options);
    }

    buyURIToken(uriToken, issuer = null, options = {}) {
        const amountObj = makeAmountObject(uriToken.Amount, EvernodeConstants.EVR, issuer);
        return this.#submitAndVerifyTransaction({
            Account: this.address,
            TransactionType: "URITokenBuy",
            Amount: amountObj,
            URITokenID: uriToken.index
        }, options);
    }

    async clearURITokenOffer(uriTokenID, options = {}) {
        return this.#submitAndVerifyTransaction({
            Account: this.address,
            TransactionType: "URITokenCancelSellOffer",
            URITokenID: uriTokenID
        }, options);
    }

    async getURITokens() {
        const obj = await this.getAccountObjects(this.address);
        return obj.filter(t => t.LedgerEntryType == 'URIToken');
    }

    async getURITokenByUri(uri, isHexUri = false) {
        const tokens = await this.getURITokens();
        const hexUri = isHexUri ? uri : TransactionHelper.asciiToHex(uri).toUpperCase();
        return tokens.find(t => t.URI == hexUri);
    }
}

function makeAmountObject(amount, currency, issuer) {
    if (typeof amount !== 'string')
        throw "Amount must be a string.";
    if (currency !== XrplConstants.XRP && !issuer)
        throw "Non-XRP currency must have an issuer.";

    const amountObj = (currency == XrplConstants.XRP) ? amount : {
        currency: currency,
        issuer: issuer,
        value: amount
    }
    return amountObj;
}

module.exports = {
    XrplAccount
}
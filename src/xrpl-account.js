const xrpl = require('xrpl');
const kp = require('ripple-keypairs');
const codec = require('ripple-address-codec');
const crypto = require("crypto");
const { XrplConstants } = require('./xrpl-common');
const { TransactionHelper } = require('./transaction-helper');
const { EventEmitter } = require('./event-emitter');
const { DefaultValues } = require('./defaults');

class XrplAccount {

    #events = new EventEmitter();
    #subscribed = false;
    #sequence;
    #sequenceCachedOn;
    #txStreamHandler;

    constructor(address, secret = null, options = {}) {
        this.xrplApi = options.xrplApi || DefaultValues.xrplApi;

        if (!this.xrplApi)
            throw "XrplAccount: xrplApi not specified.";

        this.address = address;

        this.secret = secret;
        if (this.secret)
            this.wallet = xrpl.Wallet.fromSeed(this.secret);

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

    async getInfo() {
        return await this.xrplApi.getAccountInfo(this.address);
    }

    async getSequence() {
        return (await this.getInfo()).Sequence;
    }

    async getNextSequence() {

        // If cached value is expired, delete it.
        if (this.#sequenceCachedOn && this.#sequenceCachedOn < (new Date().getTime() - 5000)) {
            this.#sequence = null;
            this.#sequenceCachedOn = null;
        }

        if (!this.#sequence) {
            const info = await this.getInfo();
            // This can get called by parallel transactions. So we are checking for null again before updating.
            if (!this.#sequence) {
                this.#sequence = info.Sequence;
                this.#sequenceCachedOn = new Date().getTime();
            }
            else {
                this.#sequence++;
            }
        }
        else {
            this.#sequence++;
        }
        return this.#sequence;
    }

    async getMessageKey() {
        return (await this.getInfo()).MessageKey;
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

    async getAccountObjects(options) {
        return await this.xrplApi.getAccountObjects(this.address, options);
    }

    async getFlags() {
        return xrpl.parseAccountRootFlags((await this.getInfo()).Flags);
    }

    async getHookStates(options = { limit: 399 }) {
        // We use a large limit since there's no way to just get the HookState objects.
        const states = await this.getAccountObjects(options);
        return states.filter(s => s.LedgerEntryType === 'HookState').map(s => {
            return {
                key: s.HookStateKey, //hex
                data: s.HookStateData //hex
            }
        });
    }

    async setMessageKey(publicKey, options = {}) {
        const result = await this.#submitAndVerifyTransaction({
            TransactionType: 'AccountSet',
            Account: this.address,
            MessageKey: publicKey,
        }, options);
        return result;
    }

    setDefaultRippling(enabled, options = {}) {

        const tx = {
            TransactionType: 'AccountSet',
            Account: this.address
        }

        if (enabled)
            tx.SetFlag = xrpl.AccountSetAsfFlags.asfDefaultRipple;
        else
            tx.ClearFlag = xrpl.AccountSetAsfFlags.asfDefaultRipple;

        return this.#submitAndVerifyTransaction(tx, options);
    }

    makePayment(toAddr, amount, currency, issuer = null, memos = null, options = {}) {

        if (typeof amount !== 'string')
            throw "Amount must be a string.";
        if (currency !== XrplConstants.XRP && !issuer)
            throw "Non-XRP currency must have an issuer.";

        const amountObj = (currency == XrplConstants.XRP) ? amount : {
            currency: currency,
            issuer: issuer,
            value: amount
        }

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

        return this.#submitAndVerifyTransaction({
            TransactionType: 'TrustSet',
            Account: this.address,
            LimitAmount: {
                currency: currency,
                issuer: issuer,
                value: limit
            },
            Flags: {
                tfSetNoRipple: !allowRippling
            },
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
                Sequence: options.sequence || await this.getNextSequence()
            }
            Object.assign(tx, txOptions);

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
}

module.exports = {
    XrplAccount
}
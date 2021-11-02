var crypto = require("crypto");
const decodeAccountID = require('ripple-address-codec').decodeAccountID;
const { RippleAPIEvents, RippleConstants } = require('./ripple-common');
const { TransactionHelper } = require('./transaction-helper');
const { EventEmitter } = require('./event-emitter');

export class XrplAccount {
    constructor(rippleAPI, address, secret = null) {
        this.rippleAPI = rippleAPI;
        this.address = address;
        this.secret = secret;
        this.events = new EventEmitter();
        this.txHelper = new TransactionHelper(this.rippleAPI, this.secret);
        this.subscribed = false;
        this.sequence = null;
        this.sequenceCachedOn = null;
    }

    deriveKeypair() {
        if (!this.secret)
            throw 'Cannot derive key pair: Account secret is empty.';

        return this.rippleAPI.api.deriveKeypair(this.secret);
    }

    async getSequence() {
        const info = await this.rippleAPI.getAccountInfo(this.address);
        return info && info.account_data.Sequence || 0;
    }

    async getNextSequence() {

        // If cached value is expired, delete it.
        if (this.sequenceCachedOn && this.sequenceCachedOn < (new Date().getTime() - 5000)) {
            this.sequence = null;
            this.sequenceCachedOn = null;
        }

        if (!this.sequence) {
            const info = await this.rippleAPI.getAccountInfo(this.address);
            // This can get called by parallel transactions. So we are checking for null again before updating.
            if (!this.sequence) {
                this.sequence = info.account_data.Sequence;
                this.sequenceCachedOn = new Date().getTime();
            }
            else {
                this.sequence++;
            }
        }
        else {
            this.sequence++;
        }
        return this.sequence;
    }

    async getEncryptionKey() {
        const info = await this.rippleAPI.getAccountInfo(this.address);
        const keyHex = info.account_data.MessageKey;
        return keyHex;
    }

    async getTrustLines(currency, issuer) {
        const lines = await this.rippleAPI.api.getTrustlines(this.address, {
            currency: currency,
            counterparty: issuer
        });
        return lines;
    }

    async setMessageKey(publicKey, options = {}) {
        const prepared = await this.rippleAPI.api.prepareSettings(this.address, {
            messageKey: publicKey
        }, await this.#getTransactionOptions(options));

        const result = await this.txHelper.submitAndVerifyTransaction(prepared);
        return result;
    }

    async setDefaultRippling(enabled, options = {}) {

        const prepared = await this.rippleAPI.api.prepareSettings(this.address, {
            defaultRipple: enabled
        }, await this.#getTransactionOptions(options));

        const result = await this.txHelper.submitAndVerifyTransaction(prepared);
        return result;
    }

    async makePayment(toAddr, amount, currency, issuer = null, memos = null, options = {}) {

        if (typeof amount !== 'string')
            throw "Amount must be a string.";

        const amountObj = {
            currency: currency,
            counterparty: issuer,
            value: amount
        }

        // Delete counterparty key if issuer is empty.
        if (!amountObj.counterparty)
            delete amountObj.counterparty;

        const prepared = await this.rippleAPI.api.preparePayment(this.address, {
            source: {
                address: this.address,
                maxAmount: amountObj
            },
            destination: {
                address: toAddr,
                amount: amountObj
            },
            memos: this.getMemoCollection(memos)
        }, await this.#getTransactionOptions(options))

        const result = await this.txHelper.submitAndVerifyTransaction(prepared);
        return result;
    }

    async setTrustLine(currency, issuer, limit, allowRippling = false, memos = null, options = {}) {

        if (typeof limit !== 'string')
            throw "Limit must be a string.";

        const prepared = await this.rippleAPI.api.prepareTrustline(this.address, {
            counterparty: issuer,
            currency: currency,
            limit: limit,
            memos: this.getMemoCollection(memos),
            ripplingDisabled: !allowRippling
        }, await this.#getTransactionOptions(options))

        const result = await this.txHelper.submitAndVerifyTransaction(prepared);
        return result;
    }

    getMemoCollection(memos) {
        return memos ? memos.filter(m => m.type).map(m => {
            return {
                type: m.type,
                format: m.format,
                data: (typeof m.data === "object") ? JSON.stringify(m.data) : m.data
            }
        }) : [];
    }

    async getChecks(fromAccount) {
        const account_objects_request = {
            command: "account_objects",
            account: fromAccount,
            ledger_index: "validated",
            type: "check"
        }
        return await this.rippleAPI.api.connection.request(account_objects_request);
    }

    async getStates() {
        const account_objects_request = {
            command: "account_objects",
            account: this.address,
            ledger_index: "validated"
        }
        const res = await this.rippleAPI.api.connection.request(account_objects_request);
        return res.account_objects ? res.account_objects : [];
    }

    async cashCheck(check, options = {}) {
        const checkIDhasher = crypto.createHash('sha512')
        checkIDhasher.update(Buffer.from('0043', 'hex'))
        checkIDhasher.update(Buffer.from(decodeAccountID(check.Account)))
        const seqBuf = Buffer.alloc(4)
        seqBuf.writeUInt32BE(check.Sequence, 0)
        checkIDhasher.update(seqBuf)
        const checkID = checkIDhasher.digest('hex').slice(0, 64).toUpperCase()
        console.log("Calculated checkID:", checkID)

        const prepared = await this.rippleAPI.api.prepareCheckCash(this.address, {
            checkID: checkID,
            amount: {
                currency: check.SendMax.currency,
                value: check.SendMax.value,
                counterparty: check.SendMax.issuer
            }
        }, await this.#getTransactionOptions(options));

        const result = await this.txHelper.submitAndVerifyTransaction(prepared);
        return result;
    }

    subscribe() {
        // Subscribe only once. Otherwise event handlers will be duplicated.
        if (this.subscribed)
            return;

        this.rippleAPI.api.connection.on("transaction", (data) => {
            const eventName = data.transaction.TransactionType.toLowerCase();
            // Emit the event only for successful transactions, Otherwise emit error.
            if (data.engine_result === "tesSUCCESS") {
                // Convert memo fields to ASCII before emitting the event.
                if (data.transaction.Memos)
                    data.transaction.Memos = data.transaction.Memos.filter(m => m.Memo).map(m => TransactionHelper.deserializeMemo(m.Memo));
                this.events.emit(eventName, data.transaction);
            }
            else {
                this.events.emit(eventName, null, data.engine_result_message);
            }
        });

        const request = {
            command: 'subscribe',
            accounts: [this.address]
        }
        const message = `Subscribed to transactions on ${this.address}`;

        // Subscribe to transactions when api is reconnected.
        // Because API will be automatically reconnected if it's disconnected.
        this.rippleAPI.events.on(RippleAPIEvents.RECONNECTED, (e) => {
            this.rippleAPI.api.connection.request(request);
            console.log(message);
        });

        this.rippleAPI.api.connection.request(request);
        console.log(message);

        this.subscribed = true;
    }

    async #getTransactionOptions(options = {}) {
        const txOptions = {
            maxLedgerVersion: options.maxLedgerVersion || this.txHelper.getMaxLedgerVersion(),
            sequence: options.sequence || await this.getNextSequence()
        }
        return txOptions;
    }
}
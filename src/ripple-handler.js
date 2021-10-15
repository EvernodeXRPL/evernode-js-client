const RippleAPI = require('ripple-lib').RippleAPI;
var crypto = require("crypto");
const decodeAccountID = require('ripple-address-codec').decodeAccountID;
const CONNECTION_RETRY_THREASHOLD = 60;
const CONNECTION_RETRY_INTERVAL = 1000;

const DEFAULT_RIPPLED_SERVER = 'wss://hooks-testnet.xrpl-labs.com';

const maxLedgerOffset = 10;

const RippleAPIEvents = {
    RECONNECTED: 'reconnected',
    LEDGER: 'ledger',
    PAYMENT: 'payment'
}

const RippleConstants = {
    MIN_XRP_AMOUNT: '0.000001'
}

const hexToASCII = (hex) => {
    let str = "";
    for (let n = 0; n < hex.length; n += 2) {
        str += String.fromCharCode(parseInt(hex.substr(n, 2), 16));
    }
    return str;
}

class EventEmitter {
    constructor() {
        this.handlers = {};
    }

    on(event, handler) {
        if (!this.handlers[event])
            this.handlers[event] = [];
        this.handlers[event].push(handler);
    }

    emit(event, value, error = null) {
        if (this.handlers[event])
            this.handlers[event].forEach(handler => handler(value, error));
    }
}

class RippleAPIWrapper {
    constructor(rippledServer = null) {

        this.connectionRetryCount = 0;
        this.connected = false;
        this.rippledServer = rippledServer || DEFAULT_RIPPLED_SERVER;
        this.events = new EventEmitter();

        this.api = new RippleAPI({ server: this.rippledServer });
        this.api.on('error', (errorCode, errorMessage) => {
            console.log(errorCode + ': ' + errorMessage);
        });
        this.api.on('connected', () => {
            console.log(`Connected to ${this.rippledServer}`);
            this.connectionRetryCount = 0;
            this.connected = true;
        });
        this.api.on('disconnected', async (code) => {
            if (!this.connected)
                return;

            this.connected = false;
            console.log(`Disconnected from ${this.rippledServer} code:`, code);
            try {
                await this.connect();
                this.events.emit(RippleAPIEvents.RECONNECTED, `Reconnected to ${this.rippledServer}`);
            }
            catch (e) { console.error(e); };
        });
        this.api.on('ledger', (ledger) => {
            this.ledgerVersion = ledger.ledgerVersion;
            this.events.emit(RippleAPIEvents.LEDGER, ledger);
        });
    }

    async connect() {
        if (this.connected)
            return;

        let retryInterval = CONNECTION_RETRY_INTERVAL;
        this.tryConnecting = true;
        // If failed, Keep retrying and increasing the retry timeout.
        while (this.tryConnecting) {
            try {
                this.connectionRetryCount++;
                await this.api.connect();
                this.ledgerVersion = await this.api.getLedgerVersion();
                return;
            }
            catch (e) {
                console.log(`Couldn't connect ${this.rippledServer} : `, e);
                // If threashold reaches, increase the retry interval.
                if (this.connectionRetryCount % CONNECTION_RETRY_THREASHOLD === 0)
                    retryInterval += CONNECTION_RETRY_INTERVAL;
                // Wait before retry.
                await new Promise(resolve => setTimeout(resolve, retryInterval));
            }
        }
    }

    async disconnect() {
        if (!this.connected)
            return;
        this.tryConnecting = false;
        this.connected = false;
        await this.api.disconnect();
        console.log(`Disconnected from ${this.rippledServer}`);
    }

    deriveAddress(publicKey) {
        return this.api.deriveAddress(publicKey);
    }

    async getAccountInfo(address) {
        return (await this.api.request('account_info', { account: address }));
    }

    async isValidKeyForAddress(publicKey, address) {
        const info = await this.getAccountInfo(address);
        const accountFlags = this.api.parseAccountFlags(info.account_data.Flags);
        const regularKey = info.account_data.RegularKey;
        const derivedPubKeyAddress = this.deriveAddress(publicKey);

        // If the master key is disabled the derived pubkey address should be the regular key.
        // Otherwise it could be account address or the regular key
        if (accountFlags.disableMasterKey)
            return regularKey && (derivedPubKeyAddress === regularKey);
        else
            return derivedPubKeyAddress === address || (regularKey && derivedPubKeyAddress === regularKey);
    }
}

class XrplAccount {
    constructor(rippleAPI, address, secret = null) {
        this.rippleAPI = rippleAPI;
        this.address = address;
        this.secret = secret;
        this.events = new EventEmitter();
        this.subscribed = false;
        this.sequence = null;
        this.sequenceCachedOn = null;
    }

    deriveKeypair() {
        if (!this.secret)
            throw 'Cannot derive key pair: Account secret is empty.';

        return this.rippleAPI.api.deriveKeypair(this.secret);
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

    getMaxLedgerVersion() {
        return this.rippleAPI.ledgerVersion + maxLedgerOffset;
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

    async setMessageKey(publicKey) {
        const prepared = await this.rippleAPI.api.prepareSettings(this.address, {
            messageKey: publicKey
        }, {
            maxLedgerVersion: this.getMaxLedgerVersion(),
            sequence: await this.getNextSequence()
        });

        const result = await this.submitAndVerifyTransaction(prepared);
        return result;
    }

    async setDefaultRippling(enabled) {

        const prepared = await this.rippleAPI.api.prepareSettings(this.address, {
            defaultRipple: enabled
        }, {
            maxLedgerVersion: this.getMaxLedgerVersion(),
            sequence: await this.getNextSequence()
        });

        const result = await this.submitAndVerifyTransaction(prepared);
        return result;
    }

    async makePayment(toAddr, amount, currency, issuer, memos = null) {

        const amountObj = {
            currency: currency,
            counterparty: issuer,
            value: amount.toString()
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
        }, {
            maxLedgerVersion: this.getMaxLedgerVersion(),
            sequence: await this.getNextSequence()
        })

        const result = await this.submitAndVerifyTransaction(prepared);
        return result;
    }

    async createTrustLine(currency, issuer, limit, allowRippling = false, memos = null) {

        const prepared = await this.rippleAPI.api.prepareTrustline(this.address, {
            counterparty: issuer,
            currency: currency,
            limit: limit.toString(),
            memos: this.getMemoCollection(memos),
            ripplingDisabled: !allowRippling
        }, {
            maxLedgerVersion: this.getMaxLedgerVersion(),
            sequence: await this.getNextSequence()
        })

        const result = await this.submitAndVerifyTransaction(prepared);
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

    async cashCheck(check) {
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
        }, {
            maxLedgerVersion: this.getMaxLedgerVersion(),
            sequence: await this.getNextSequence()
        });

        const result = await this.submitAndVerifyTransaction(prepared);
        return result;
    }

    async submitAndVerifyTransaction(preparedTx) {

        const signed = this.rippleAPI.api.sign(preparedTx.txJSON, this.secret);
        const submission = await this.rippleAPI.api.submit(signed.signedTransaction);
        if (submission.resultCode !== "tesSUCCESS") {
            console.log("Txn submission failure: " + submission.resultCode)
            return false;
        }

        const verified = await this.verifyTransaction(signed.id, this.rippleAPI.ledgerVersion, this.getMaxLedgerVersion());
        return verified ? verified : false;
    }

    verifyTransaction(txHash, minLedger, maxLedger) {
        console.log("Waiting for verification...");
        return new Promise(resolve => {
            this.waitForTransactionVerification(txHash, minLedger, maxLedger, resolve);
        })
    }

    waitForTransactionVerification(txHash, minLedger, maxLedger, resolve) {
        this.rippleAPI.api.getTransaction(txHash, {
            minLedgerVersion: minLedger,
            maxLedgerVersion: maxLedger
        }).then(data => {
            console.log(data.outcome.result);
            if (data.outcome.result !== 'tesSUCCESS')
                console.log("Transaction verification failed. Result: " + data.outcome.result);
            resolve(data.outcome.result === 'tesSUCCESS' ? { txHash: data.id, ledgerVersion: data.outcome.ledgerVersion } : false);
        }).catch(error => {
            // If transaction not in latest validated ledger, try again until max ledger is hit.
            if (error instanceof this.rippleAPI.api.errors.PendingLedgerVersionError || error instanceof this.rippleAPI.api.errors.NotFoundError) {
                setTimeout(() => {
                    this.waitForTransactionVerification(txHash, minLedger, maxLedger, resolve);
                }, 1000);
            }
            else {
                console.log(error);
                console.log("Transaction verification failed.");
                resolve(false); // give up.
            }
        })
    }

    deserializeMemo(memo) {
        return {
            type: memo.MemoType ? hexToASCII(memo.MemoType) : null,
            format: memo.MemoFormat ? hexToASCII(memo.MemoFormat) : null,
            data: memo.MemoData ? hexToASCII(memo.MemoData) : null
        };
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
                    data.transaction.Memos = data.transaction.Memos.filter(m => m.Memo).map(m => this.deserializeMemo(m.Memo));
                this.events.emit(eventName, data.transaction);
            }
            else
                this.events.emit(eventName, null, data.engine_result_message);
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
}

module.exports = {
    XrplAccount,
    RippleAPIWrapper,
    RippleAPIEvents,
    RippleConstants
}
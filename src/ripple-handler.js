const RippleAPI = require('ripple-lib').RippleAPI;
var crypto = require("crypto");
const decodeAccountID = require('ripple-address-codec').decodeAccountID;
const CONNECTION_RETRY_THREASHOLD = 60;
const CONNECTION_RETRY_INTERVAL = 1000;

const DISABLE_MASTERKEY = 0x100000;

const DEFAULT_RIPPLED_SERVER = 'wss://hooks-testnet.xrpl-labs.com';

const maxLedgerOffset = 10;

const RippleAPIEvents = {
    RECONNECTED: 'reconnected',
    LEDGER: 'ledger',
    PAYMENT: 'payment'
}

const RippleConstants = {
    MIN_XRP_AMOUNT: 0.000001
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

    async getLedgerVersion() {
        return (await this.api.getLedgerVersion());
    }

    async isValidAddress(publicKey, address) {
        const derivedAddress = this.deriveAddress(publicKey);
        const info = await this.getAccountInfo(address);
        const accountFlags = info.account_data.Flags;
        const regularKey = info.account_data.RegularKey;
        const masterKeyDisabled = (DISABLE_MASTERKEY & accountFlags) === DISABLE_MASTERKEY;

        // If the master key is disabled the derived address should be the regular key.
        // Otherwise it could be master key or the regular key
        if (masterKeyDisabled)
            return regularKey && (derivedAddress === regularKey);
        else
            return derivedAddress === address || (regularKey && derivedAddress === regularKey);
    }
}

class XrplAccount {
    constructor(rippleAPI, address, secret = null) {
        this.rippleAPI = rippleAPI;
        this.address = address;
        this.secret = secret;
        this.events = new EventEmitter();
        this.subscribed = false;
    }

    deriveKeypair() {
        if (!this.secret)
            throw 'Cannot derive key pair: Account secret is empty.';

        return this.rippleAPI.api.deriveKeypair(this.secret);
    }

    async setDefaultRippling(enabled) {

        const ledger = await (await this.rippleAPI.api.getLedger()).ledgerVersion;
        const maxLedger = ledger + maxLedgerOffset;

        const prepared = await this.rippleAPI.api.prepareSettings(this.address, {
            defaultRipple: enabled
        }, {
            maxLedgerVersion: maxLedger
        });
        const signed = this.rippleAPI.api.sign(prepared.txJSON, this.secret);

        await this.rippleAPI.api.submit(signed.signedTransaction);
        const verified = await this.verifyTransaction(signed.id, ledger, maxLedger);
        return verified ? verified : false;
    }

    async getTrustLines(currency, issuer) {
        const lines = await this.rippleAPI.api.getTrustlines(this.address, {
            currency: currency,
            counterparty: issuer
        });
        return lines;
    }

    async makePayment(toAddr, amount, currency, issuer, memos = null) {
        // Get current ledger.
        const ledger = await (await this.rippleAPI.api.getLedger()).ledgerVersion;
        const maxLedger = ledger + maxLedgerOffset;

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
            maxLedgerVersion: maxLedger
        })

        const signed = this.rippleAPI.api.sign(prepared.txJSON, this.secret);

        await this.rippleAPI.api.submit(signed.signedTransaction);
        const verified = await this.verifyTransaction(signed.id, ledger, maxLedger);
        return verified ? verified : false;
    }

    async createTrustline(currency, issuer, limit, allowRippling, memos = null) {
        const res = await this.createTrustlines([{
            issuer: issuer,
            limit: limit,
            currency: currency,
            allowRippling: allowRippling,
            memos: this.getMemoCollection(memos)
        }]);
        return res ? res[0] : false;
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

    async createTrustlines(lines) {
        // Get current ledger.
        const ledger = await (await this.rippleAPI.api.getLedger()).ledgerVersion;
        const maxLedger = ledger + maxLedgerOffset;

        // Create and verify multiple trust lines in parallel.
        const tasks = [];
        for (const line of lines) {
            tasks.push(new Promise(async (resolve) => {
                const prepared = await this.rippleAPI.api.prepareTrustline(this.address, {
                    counterparty: line.issuer,
                    currency: line.currency,
                    limit: line.limit.toString(),
                    memos: line.memos,
                    ripplingDisabled: !line.allowRippling
                }, {
                    maxLedgerVersion: maxLedger
                })

                const signed = this.rippleAPI.api.sign(prepared.txJSON, this.secret);

                await this.rippleAPI.api.submit(signed.signedTransaction);
                const verified = await this.verifyTransaction(signed.id, ledger, maxLedger);
                verified ? resolve(verified) : resolve(false);
            }));
        }

        const results = await Promise.all(tasks);
        return results;
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

    async cashCheck(check) {
        const checkIDhasher = crypto.createHash('sha512')
        checkIDhasher.update(Buffer.from('0043', 'hex'))
        checkIDhasher.update(Buffer.from(decodeAccountID(check.Account)))
        const seqBuf = Buffer.alloc(4)
        seqBuf.writeUInt32BE(check.Sequence, 0)
        checkIDhasher.update(seqBuf)
        const checkID = checkIDhasher.digest('hex').slice(0, 64).toUpperCase()
        console.log("Calculated checkID:", checkID)

        const ledger = await (await this.rippleAPI.api.getLedger()).ledgerVersion;
        const maxLedger = ledger + maxLedgerOffset;
        const prep = await this.rippleAPI.api.prepareCheckCash(this.address, {
            checkID: checkID,
            amount: {
                currency: check.SendMax.currency,
                value: check.SendMax.value,
                counterparty: check.SendMax.issuer
            }
        }, {
            maxLedgerVersion: maxLedger
        });
        const signed = this.rippleAPI.api.sign(prep.txJSON, this.secret);
        await this.rippleAPI.api.submit(signed.signedTransaction);
        const verified = await this.verifyTransaction(signed.id, ledger, maxLedger);
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
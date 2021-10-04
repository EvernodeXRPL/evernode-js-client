const eccrypto = require("eccrypto");
const RippleAPI = require('ripple-lib').RippleAPI;

const CONNECTION_RETRY_THREASHOLD = 60;
const CONNECTION_RETRY_INTERVAL = 1000;

const DISABLE_MASTERKEY = 0x100000;

const maxLedgerOffset = 10;

const MemoTypes = {
    REDEEM: 'evnRedeem',
    REDEEM_REF: 'evnRedeemRef',
    REDEEM_RESP: 'evnRedeemResp',
    HOST_REG: 'evnHostReg',
    HOST_DEREG: 'evnHostDereg',
}

const MemoFormats = {
    TEXT: 'text/plain',
    JSON: 'text/json',
    BINARY: 'binary'
}

const Events = {
    RECONNECTED: 'reconnected',
    LEDGER: 'ledger',
    PAYMENT: 'payment'
}

const ErrorCodes = {
    REDEEM_ERR: 'REDEEM_ERR'
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
    constructor(rippleServer) {
        this.connectionRetryCount = 0;
        this.connected = false;
        this.rippleServer = rippleServer;
        this.events = new EventEmitter();

        this.api = new RippleAPI({ server: this.rippleServer });
        this.api.on('error', (errorCode, errorMessage) => {
            console.log(errorCode + ': ' + errorMessage);
        });
        this.api.on('connected', () => {
            console.log(`Connected to ${this.rippleServer}`);
            this.connectionRetryCount = 0;
            this.connected = true;
        });
        this.api.on('disconnected', async (code) => {
            if (!this.connected)
                return;

            this.connected = false;
            console.log(`Disconnected from ${this.rippleServer} code:`, code);
            try {
                await this.connect();
                this.events.emit(Events.RECONNECTED, `Reconnected to ${this.rippleServer}`);
            }
            catch (e) { console.error(e); };
        });
        this.api.on('ledger', (ledger) => {
            this.events.emit(Events.LEDGER, ledger);
        });
    }

    async connect() {
        if (this.connected)
            return;

        let retryInterval = CONNECTION_RETRY_INTERVAL;
        // If failed, Keep retrying and increasing the retry timeout.
        while (true) {
            try {
                this.connectionRetryCount++;
                console.log(`Trying to connect ${this.rippleServer}`);
                await this.api.connect();
                return;
            }
            catch (e) {
                console.log(`Couldn't connect ${this.rippleServer} : `, e);
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

        this.connected = false;
        await this.api.disconnect();
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
        return res[0];
    }

    getMemoCollection(memos) {
        return memos ? memos.filter(m => m.data).map(m => {
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
                console.log("Submitted trust line.");
                const verified = await this.verifyTransaction(signed.id, ledger, maxLedger);
                verified ? resolve(verified) : resolve(false);
            }));
        }

        const results = await Promise.all(tasks);
        return results;
    }

    verifyTransaction(txHash, minLedger, maxLedger) {
        return new Promise(resolve => {
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
                    console.log("Waiting for verification...");
                    setTimeout(() => {
                        this.verifyTransaction(txHash, minLedger, maxLedger).then(result => resolve(result));
                    }, 1000);
                }
                else {
                    console.log(error);
                    console.log("Transaction verification failed.");
                    resolve(false); // give up.
                }
            })
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
        this.rippleAPI.events.on(Events.RECONNECTED, (e) => {
            this.rippleAPI.api.connection.request(request);
            console.log(message);
        });

        this.rippleAPI.api.connection.request(request);
        console.log(message);

        this.subscribed = true;
    }
}

class EncryptionHelper {
    // Offsets of the properties in the encrypted buffer.
    static ivOffset = 65;
    static macOffset = this.ivOffset + 16;
    static ciphertextOffset = this.macOffset + 32;
    static contentFormat = 'base64';
    static keyFormat = 'hex';

    static async encrypt(publicKey, json) {
        // For the encryption library, both keys and data should be buffers.
        const encrypted = await eccrypto.encrypt(Buffer.from(publicKey, this.keyFormat), Buffer.from(JSON.stringify(json)));
        // Concat all the properties of the encrypted object to a single buffer.
        return Buffer.concat([encrypted.ephemPublicKey, encrypted.iv, encrypted.mac, encrypted.ciphertext]).toString(this.contentFormat);
    }

    static async decrypt(privateKey, encrypted) {
        // Extract the buffer from the string and prepare encrypt object from buffer offsets for decryption.
        const encryptedBuf = Buffer.from(encrypted, this.contentFormat);
        const encryptedObj = {
            ephemPublicKey: encryptedBuf.slice(0, this.ivOffset),
            iv: encryptedBuf.slice(this.ivOffset, this.macOffset),
            mac: encryptedBuf.slice(this.macOffset, this.ciphertextOffset),
            ciphertext: encryptedBuf.slice(this.ciphertextOffset)
        }
        return JSON.parse((await eccrypto.decrypt(Buffer.from(privateKey, this.keyFormat).slice(1), encryptedObj)).toString());
    }
}

module.exports = {
    XrplAccount,
    RippleAPIWrapper,
    EncryptionHelper,
    MemoFormats,
    MemoTypes,
    Events,
    ErrorCodes
}
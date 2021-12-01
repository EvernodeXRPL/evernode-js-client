const xrpl = require('xrpl');
const kp = require('ripple-keypairs');
const { EventEmitter } = require('./event-emitter');
const { DefaultValues } = require('./defaults');
const { TransactionHelper } = require('./transaction-helper');
const { XrplApiEvents } = require('./xrpl-common');

class XrplApi {

    #client;
    #events = new EventEmitter();

    constructor(rippledServer = null, options = {}) {

        this.connected = false;
        this.rippledServer = rippledServer || DefaultValues.rippledServer;

        this.#client = options.xrplClient || new xrpl.Client(this.rippledServer);
        this.#client.on('error', (errorCode, errorMessage) => {
            console.log(errorCode + ': ' + errorMessage);
        });
        this.#client.on('disconnected', async (code) => {
            if (!this.connected)
                return;

            this.connected = false;
            console.log(`Disconnected from ${this.rippledServer} code:`, code);
        });
        this.#client.on('ledgerClosed', (ledger) => {
            this.ledgerIndex = ledger.ledger_index;
            this.#events.emit(XrplApiEvents.LEDGER, ledger);
        });
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

    async connect() {
        if (this.connected)
            return;

        try {
            await this.#client.connect();
            console.log(`Connected to ${this.rippledServer}`);
            this.connected = true;

            this.ledgerIndex = await this.#client.getLedgerIndex();
            this.#subscribeToStream('ledger');
        }
        catch (e) {
            console.log(`Couldn't connect ${this.rippledServer} : `, e);
        }
    }

    async disconnect() {
        const wasConnected = this.connected;
        this.connected = false;
        await this.#client.disconnect().catch(console.error);
        if (wasConnected)
            console.log(`Disconnected from ${this.rippledServer}`);
    }

    async isValidKeyForAddress(publicKey, address) {
        const info = await this.getAccountInfo(address);
        const accountFlags = xrpl.parseAccountRootFlags(info.Flags);
        const regularKey = info.RegularKey;
        const derivedPubKeyAddress = kp.deriveAddress(publicKey);

        // If the master key is disabled the derived pubkey address should be the regular key.
        // Otherwise it could be account address or the regular key
        if (accountFlags.lsfDisableMaster)
            return regularKey && (derivedPubKeyAddress === regularKey);
        else
            return derivedPubKeyAddress === address || (regularKey && derivedPubKeyAddress === regularKey);
    }

    async getAccountInfo(address) {
        const resp = (await this.#client.request({ command: 'account_info', account: address }));
        return resp?.result?.account_data;
    }

    async getAccountObjects(address, options) {
        const resp = (await this.#client.request({ command: 'account_objects', account: address, ...options }));
        if (resp?.result?.account_objects)
            return resp.result.account_objects;
        return [];
    }

    async getTrustlines(address, options) {
        const resp = (await this.#client.request({ command: 'account_lines', account: address, ledger_index: "validated", ...options }));
        if (resp?.result?.lines)
            return resp.result.lines;
        return [];
    }

    async submitAndVerify(tx, options) {
        return await this.#client.submitAndWait(tx, options);
    }

    async subscribeToAddress(address, handler) {

        // Register the event handler.
        this.#client.on("transaction", (data) => {
            if (data.validated && data.transaction.Destination === address) { // Only incoming transactions.
                const tx = { ...data.transaction }; // Create an object copy. Otherwise xrpl client will mutate the transaction object,
                const eventName = tx.TransactionType.toLowerCase();
                // Emit the event only for successful transactions, Otherwise emit error.
                if (data.engine_result === "tesSUCCESS") {
                    tx.Memos = TransactionHelper.deserializeMemos(tx.Memos);
                    handler(eventName, tx);
                }
                else {
                    handler(eventName, null, data.engine_result_message);
                }
            }
        });

        await this.#client.request({ command: 'subscribe', accounts: [address] });
        console.log(`Subscribed to transactions on ${address}`);
    }

    async #subscribeToStream(streamName) {
        await this.#client.request({ command: 'subscribe', streams: [streamName] });
    }
}

module.exports = {
    XrplApi
}
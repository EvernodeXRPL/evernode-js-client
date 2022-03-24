const xrpl = require('xrpl');
const kp = require('ripple-keypairs');
const { EventEmitter } = require('./event-emitter');
const { DefaultValues } = require('./defaults');
const { TransactionHelper } = require('./transaction-helper');
const { XrplApiEvents } = require('./xrpl-common');

class XrplApi {

    #rippledServer;
    #client;
    #events = new EventEmitter();
    #addressSubscriptions = [];
    #maintainConnection = false;

    constructor(rippledServer = null) {

        this.#rippledServer = rippledServer || DefaultValues.rippledServer;
        this.#initXrplClient();
    }

    async #initXrplClient() {

        if (this.#client) { // If the client already exists, clean it up.
            this.#client.removeAllListeners(); // Remove existing event listeners to avoid them getting called from the old client object.
            await this.#client.disconnect();
            this.#client = null;
        }

        this.#client = new xrpl.Client(this.#rippledServer);

        this.#client.on('error', (errorCode, errorMessage) => {
            console.log(errorCode + ': ' + errorMessage);
        });

        this.#client.on('disconnected', (code) => {
            if (this.#maintainConnection) {
                console.log(`Connection failure for ${this.#rippledServer} (code:${code})`);
                console.log("Reinitializing xrpl client.");
                this.#initXrplClient().then(() => this.#connectXrplClient(true));
            }
        });

        this.#client.on('ledgerClosed', (ledger) => {
            this.ledgerIndex = ledger.ledger_index;
            this.#events.emit(XrplApiEvents.LEDGER, ledger);
        });

        this.#client.on("transaction", async (data) => {
            if (data.validated) {
                // NFTokenAcceptOffer transactions does not contains Destination.
                // So we check whether the accepted sell offer is created by us, and also we take the token id from the sell offer.
                if (data.transaction.TransactionType === 'NFTokenAcceptOffer') {
                    for (const subscription of this.#addressSubscriptions) {
                        const offer = (await this.getNftOffers(subscription.address, { ledger_index: data.ledger_index - 1 }))?.find(o => o.index === (data.transaction.SellOffer || data.transaction.BuyOffer));
                        if (offer) {
                            // We populate some sell offer properties to the transaction to be sent with the event.
                            data.transaction.Destination = subscription.address;
                            // Replace the offer with the found offer object.
                            if (data.transaction.SellOffer)
                                data.transaction.SellOffer = offer;
                            else if (data.transaction.BuyOffer)
                                data.transaction.BuyOffer = offer;
                            break;
                        }
                    }
                }
                
                const matches = this.#addressSubscriptions.filter(s => s.address === data.transaction.Destination); // Only incoming transactions.
                if (matches.length > 0) {
                    const tx = {
                        LedgerHash: data.ledger_hash,
                        LedgerIndex: data.ledger_index,
                        ...data.transaction
                    }; // Create an object copy. Otherwise xrpl client will mutate the transaction object,
                    const eventName = tx.TransactionType.toLowerCase();
                    // Emit the event only for successful transactions, Otherwise emit error.
                    if (data.engine_result === "tesSUCCESS") {
                        tx.Memos = TransactionHelper.deserializeMemos(tx.Memos);
                        matches.forEach(s => s.handler(eventName, tx));
                    }
                    else {
                        matches.forEach(s => s.handler(eventName, null, data.engine_result_message));
                    }
                }
            }
        });
    }

    async #connectXrplClient(reconnect = false) {

        if (reconnect) {
            let attempts = 0;
            while (this.#maintainConnection) { // Keep attempting until consumer calls disconnect() manually.
                console.log(`Reconnection attempt ${++attempts}`);
                try {
                    await this.#client.connect();
                    break;
                }
                catch {
                    if (this.#maintainConnection) {
                        const delaySec = 2 * attempts; // Retry with backoff delay.
                        console.log(`Attempt ${attempts} failed. Retrying in ${delaySec}s...`);
                        await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
                    }
                }
            }
        }
        else {
            // Single attempt and throw error. Used for initial connect() call.
            await this.#client.connect();
        }

        // After connection established, check again whether maintainConnections has become false.
        // This is in case the consumer has called disconnect() while connection is being established.
        if (this.#maintainConnection) {
            this.ledgerIndex = await this.#client.getLedgerIndex();
            this.#subscribeToStream('ledger');

            // Re-subscribe to existing account address subscriptions (in case this is a reconnect)
            if (this.#addressSubscriptions.length > 0)
                await this.#client.request({ command: 'subscribe', accounts: this.#addressSubscriptions.map(s => s.address) });
        }
        else {
            await this.disconnect();
        }
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
        if (this.#maintainConnection)
            return;

        this.#maintainConnection = true;
        await this.#connectXrplClient();
    }

    async disconnect() {
        this.#maintainConnection = false;

        if (this.#client.isConnected()) {
            await this.#client.disconnect().catch(console.error);
        }
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

    async getNftOffers(address, options) {
        const offers = await this.getAccountObjects(address, options);
        // TODO: Pass rippled filter parameter when xrpl.js supports it.
        return offers.filter(o => o.LedgerEntryType == 'NFTokenOffer');
    }

    async getTrustlines(address, options) {
        const resp = (await this.#client.request({ command: 'account_lines', account: address, ledger_index: "validated", ...options }));
        if (resp?.result?.lines)
            return resp.result.lines;
        return [];
    }

    async getNfts(address, options) {
        const resp = (await this.#client.request({ command: 'account_nfts', account: address, ledger_index: "validated", ...options }));
        if (resp?.result?.account_nfts)
            return resp.result.account_nfts;
        return [];
    }

    async getOffers(address, options) {
        const resp = (await this.#client.request({ command: 'account_offers', account: address, ledger_index: "validated", ...options }));
        if (resp?.result?.offers)
            return resp.result.offers;
        return [];
    }

    async submitAndVerify(tx, options) {
        return await this.#client.submitAndWait(tx, options);
    }

    async subscribeToAddress(address, handler) {
        this.#addressSubscriptions.push({ address: address, handler: handler });
        await this.#client.request({ command: 'subscribe', accounts: [address] });
    }

    async unsubscribeFromAddress(address, handler) {
        for (let i = this.#addressSubscriptions.length - 1; i >= 0; i--) {
            const sub = this.#addressSubscriptions[i];
            if (sub.address === address && sub.handler === handler)
                this.#addressSubscriptions.splice(i, 1);
        }
        await this.#client.request({ command: 'unsubscribe', accounts: [address] });
    }

    async #subscribeToStream(streamName) {
        await this.#client.request({ command: 'subscribe', streams: [streamName] });
    }
}

module.exports = {
    XrplApi
}
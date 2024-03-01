const xrpl = require('xrpl');
const kp = require('ripple-keypairs');
const { EventEmitter } = require('./event-emitter');
const { Defaults } = require('./defaults');
const { TransactionHelper } = require('./transaction-helper');
const { XrplApiEvents } = require('./xrpl-common');
const { XrplAccount } = require('./xrpl-account');
const { XrplHelpers } = require('./xrpl-helpers')

const MAX_PAGE_LIMIT = 400;
const API_REQ_TYPE = {
    NAMESPACE_ENTRIES: 'namespace_entries',
    ACCOUNT_OBJECTS: 'account_objects',
    LINES: 'lines',
    ACCOUNT_NFTS: 'account_nfts',
    OFFERS: 'offers',
    TRANSACTIONS: 'transactions'
}

const RESPONSE_WATCH_TIMEOUT = 1000
const NETWORK_MODES = {
    INSUFFICIENT_NETWORK_MODE: 'InsufficientNetworkMode'
}

const FUNCTIONING_SERVER_STATES = ['full', 'validating', 'proposing']
const LEDGER_DESYNC_TIME = 20000

class XrplApi {

    #primaryServer;
    #fallbackServers;
    #client;
    #events = new EventEmitter();
    #addressSubscriptions = [];
    #isPermanentlyDisconnected = false;
    #isConnectionAcquired = false;
    #isClientAcquired = false;
    #isPrimaryServerConnected = false;
    #isFallbackServerConnected = false;
    #xrplClientOptions;
    #autoReconnect;

    constructor(rippledServer = null, options = {}) {
        if (rippledServer == '-') {
            this.#primaryServer = null;
        } else {
            this.#primaryServer = rippledServer || Defaults.values.rippledServer;
        }
        this.#fallbackServers = options.fallbackRippledServers || Defaults.values.fallbackRippledServers || [];

        if (!this.#primaryServer && (!this.#fallbackServers || !this.#fallbackServers.length))
            throw 'Either primaryServer or fallbackServers required.';

        this.#xrplClientOptions = options.xrplClientOptions;
        this.#autoReconnect = options.autoReconnect ?? true;
    }

    async #acquireClient() {
        while (!(this.#isPrimaryServerConnected || this.#isFallbackServerConnected) && this.#isClientAcquired) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.#isClientAcquired = true;
    }

    #releaseClient() {
        this.#isClientAcquired = false;
    }

    async #acquireConnection() {
        while (this.#isConnectionAcquired) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        this.#isConnectionAcquired = true;
    }

    #releaseConnection() {
        this.#isConnectionAcquired = false;
    }

    async #setXrplClient(client) {
        try {
            if (this.#client) { // Clear all listeners if there's an already created client.
                await this.#client.removeAllListeners();
                await this.#client.disconnect();
            }

            this.#client = client;
        }
        catch (e) {
            console.log("Error occurred in Client initiation:", e)
        }
    }

    async #handleClientConnect(client) {
        await this.#initEventListeners(client);

        if (!client.isConnected())
            await client.connect();

        const resp = await client.request({ command: 'server_state', ledger_index: "current" });
        const serverState = resp?.result?.state?.server_state;

        if (!FUNCTIONING_SERVER_STATES.includes(serverState))
            throw "Client might have functioning issues."
    }

    async #initEventListeners(client) {
        // First remove all the listeners.
        try {
            await client.removeAllListeners();
        }
        catch { }

        client.on('error', (errorCode, errorMessage) => {
            console.log(errorCode + ': ' + errorMessage);
        });

        client.on('connected', async () => {
            await this.#setXrplClient(client)
        });

        client.on('disconnected', async (code) => {
            this.#events.emit(XrplApiEvents.DISCONNECTED, code);

            this.#isPrimaryServerConnected = false;
            this.#isFallbackServerConnected = false;

            if (this.#autoReconnect && !this.#isPermanentlyDisconnected) {
                console.log(`Connection failure for ${client.url} (code:${code})`);
                console.log("Re-initializing xrpl client.");
                try {
                    await this.#connectXrplClient(true);
                }
                catch (e) {
                    console.log("Error occurred while re-initializing", e)
                }
            }
        });

        let ledgerTimeout;

        client.on('ledgerClosed', (ledger) => {
            if (ledgerTimeout) {
                clearTimeout(ledgerTimeout);
            }

            ledgerTimeout = setTimeout(async () => {
                let serverState = await this.getServerState();

                if (!FUNCTIONING_SERVER_STATES.includes(serverState)) {
                    this.#events.emit(XrplApiEvents.SERVER_DESYNCED, { "server_state": serverState });
                }
                clearTimeout(ledgerTimeout);
            }, LEDGER_DESYNC_TIME);

            this.ledgerIndex = ledger.ledger_index;
            this.#events.emit(XrplApiEvents.LEDGER, ledger);
        });

        client.on("transaction", async (data) => {
            try {
                if (data.validated) {
                    // NFTokenAcceptOffer transactions does not contain a Destination. So we check whether the accepted offer is created by which subscribed account
                    if (data.transaction.TransactionType === 'URITokenBuy') {
                        // We take all the offers created by subscribed accounts in previous ledger until we get the respective offer.
                        for (const subscription of this.#addressSubscriptions) {
                            const acc = new XrplAccount(subscription.address, null, { xrplApi: this });
                            // Here we access the offers that were there in this account based on the given ledger index.
                            const offers = await acc.getURITokens({ ledger_index: data.ledger_index - 1 });
                            // Filter out the matching URI token offer for the scenario.
                            const offer = offers.find(o => o.index === data.transaction.URITokenID && o.Amount);
                            // When we find the respective offer. We populate the destination and offer info and then we break the loop.
                            if (offer) {
                                // We populate some sell offer properties to the transaction to be sent with the event.
                                data.transaction.Destination = subscription.address;
                                // Replace the offer with the found offer object.
                                data.transaction.URITokenSellOffer = offer;
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
                        };

                        if (data.meta?.delivered_amount)
                            tx.DeliveredAmount = data.meta.delivered_amount;

                        // Create an object copy. Otherwise xrpl client will mutate the transaction object,
                        const eventName = tx.TransactionType.toLowerCase();
                        // Emit the event only for successful transactions, Otherwise emit error.
                        if (data.engine_result === "tesSUCCESS") {
                            tx.Memos = TransactionHelper.deserializeMemos(tx.Memos);
                            tx.HookParameters = TransactionHelper.deserializeHookParams(tx.HookParameters);
                            matches.forEach(s => s.handler(eventName, tx));
                        }
                        else {
                            matches.forEach(s => s.handler(eventName, null, data.engine_result_message));
                        }
                    }
                }
            } catch (e) {
                console.log("Error occurred while listening to transactions.", e)
            }
        });
    }

    async #attemptFallbackServerReconnect(maxRounds, attemptsPerServer = 3) {
        if (!this.#fallbackServers || this.#fallbackServers?.length == 0)
            return;

        await this.#acquireClient();

        const fallbackServers = this.#fallbackServers;
        let round = 0;
        while (!this.#isPermanentlyDisconnected && !this.#isPrimaryServerConnected && !this.#isFallbackServerConnected && (!maxRounds || round < maxRounds)) { // Keep attempting until consumer calls disconnect() manually or if the primary server is disconnected.
            ++round;
            serverIterator:
            for (let serverIndex in fallbackServers) {
                const server = fallbackServers[serverIndex];
                for (let attempt = 0; attempt < attemptsPerServer;) {
                    if (this.#isPrimaryServerConnected || this.#isPermanentlyDisconnected) {
                        break serverIterator;
                    }
                    ++attempt;
                    const client = new xrpl.Client(server, this.#xrplClientOptions);
                    try {
                        if (!this.#isPrimaryServerConnected) {
                            await this.#handleClientConnect(client);
                            this.#isFallbackServerConnected = true;
                        }
                        break serverIterator;
                    }
                    catch (e) {
                        this.#releaseClient();
                        console.log(`Error occurred while connecting to fallback server ${server}`);
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        if (client.isConnected()) {
                            console.log('Connection closure already handled');
                            await client.disconnect();
                        }

                        if (!this.#isPermanentlyDisconnected) {
                            if (!maxRounds || round < maxRounds)
                                console.log(`Fallback server ${server} connection attempt ${attempt} failed. Retrying in ${2 * round}s...`);
                            else
                                return { error: `Fallback server ${server} connection max attempts failed.`, exception: e };
                            await new Promise(resolve => setTimeout(resolve, 2 * round * 1000));
                        }
                    }
                }
            }
        }

        return {};
    }

    async #attemptPrimaryServerReconnect(maxAttempts = null) {
        await this.#acquireClient();

        let attempt = 0;
        while (!this.#isPermanentlyDisconnected && !this.#isPrimaryServerConnected && !this.#isFallbackServerConnected) { // Keep attempting until consumer calls disconnect() manually.
            ++attempt;
            const client = new xrpl.Client(this.#primaryServer, this.#xrplClientOptions);
            try {
                await this.#handleClientConnect(client);
                this.#isPrimaryServerConnected = true;
                break;
            }
            catch (e) {
                this.#releaseClient();
                console.log("Error occurred while re-connecting to the primary server")
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (client.isConnected()) {
                    console.log('Connection closure already handled');
                    await client.disconnect();
                }

                if (!this.#isPermanentlyDisconnected) {
                    const delaySec = 2 * attempt; // Retry with backoff delay.
                    if (!maxAttempts || attempt < maxAttempts)
                        console.log(`Primary server ${this.#primaryServer} attempt ${attempt} failed. Retrying in ${delaySec}s...`);
                    else
                        return { error: `Primary server ${this.#primaryServer} connection max attempts failed.`, exception: e };
                    await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
                }
            }
        }

        return {};
    }

    async #connectXrplClient(reconnect = false) {
        let res = [];
        if (reconnect) {
            if (this.#primaryServer) {
                res = await Promise.all([this.#attemptPrimaryServerReconnect(), this.#attemptFallbackServerReconnect()]);
            } else {
                res = [await this.#attemptFallbackServerReconnect()];
            }
        }
        else {
            if (this.#primaryServer) {
                res = await Promise.all([this.#attemptPrimaryServerReconnect(1), this.#attemptFallbackServerReconnect(1, 1)]);
            } else {
                res = [await this.#attemptFallbackServerReconnect(1, 1)];
            }
        }

        if (res.filter(r => r && !r.error).length == 0)
            throw res.filter(r => r && r.error).map(r => r.error);

        // After connection established, check again whether maintainConnections has become false.
        // This is in case the consumer has called disconnect() while connection is being established.
        if (!this.#isPermanentlyDisconnected) {
            await this.#waitForConnection();
            this.#releaseClient();

            this.ledgerIndex = await this.#getLedgerIndex();

            this.#subscribeToStream('ledger');

            // Re-subscribe to existing account address subscriptions (in case this is a reconnect)
            if (this.#addressSubscriptions.length > 0)
                await this.#handleClientRequest({ command: 'subscribe', accounts: this.#addressSubscriptions.map(s => s.address) });
        }
        else {
            this.#releaseClient();
            await this.disconnect();
        }
    }

    async #requestWithPaging(requestObj, requestType) {
        let res = [];
        let checked = false;
        let resp;
        let count = requestObj?.limit;

        while ((!count || count > 0) && (!checked || resp?.result?.marker)) {
            checked = true;
            requestObj.limit = count ? Math.min(count, MAX_PAGE_LIMIT) : MAX_PAGE_LIMIT;
            if (resp?.result?.marker)
                requestObj.marker = resp?.result?.marker;
            else
                delete requestObj.marker;
            resp = (await this.#handleClientRequest(requestObj));
            if (resp?.result && resp?.result[requestType])
                res.push(...resp.result[requestType]);
            if (count)
                count -= requestObj.limit;
        }

        return res;
    }

    async #handleClientRequest(request = {}) {
        await this.#acquireConnection();
        try {
            const response = await this.#client.request(request);
            this.#releaseConnection();
            return response;
        }
        catch (e) {
            this.#releaseConnection();
            if (e?.data?.error_message === NETWORK_MODES.INSUFFICIENT_NETWORK_MODE) {
                this.#events.emit(XrplApiEvents.SERVER_DESYNCED, e?.data?.error_code);
            }
            throw e;
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

    async #waitForConnection() {
        while (!(this.#isPrimaryServerConnected || this.#isFallbackServerConnected)) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        return true;
    }

    async connect() {
        this.#isPermanentlyDisconnected = false;

        if (!this.#client || !this.#client.isConnected()) {
            await this.#connectXrplClient();
        }
        const definitions = await this.#handleClientRequest({ command: 'server_definitions' })
        this.xrplHelper = new XrplHelpers(definitions.result);
    }

    async disconnect() {
        await this.#acquireConnection();

        try {
            this.#isPermanentlyDisconnected = true;

            if (this.#client && this.#client.isConnected()) {
                await this.#client.disconnect().catch(console.error);
            }
            this.#releaseConnection();
        }
        catch (e) {
            this.#releaseConnection();
            throw e;
        }
    }

    async #getLedgerIndex() {
        await this.#acquireConnection();

        try {
            const index = await this.#client.getLedgerIndex();
            this.#releaseConnection();
            return index;
        }
        catch (e) {
            this.#releaseConnection();
            throw e;
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

    async isAccountExists(address) {
        try {
            await this.#handleClientRequest({ command: 'account_info', account: address });
            return true;
        }
        catch (e) {
            if (e.data.error === 'actNotFound') return false;
            else throw e;
        }
    }

    async getServerState(ledgerIdx = "current") {
        const resp = (await this.#handleClientRequest({ command: 'server_state', ledger_index: ledgerIdx }));
        return resp?.result?.state?.server_state;
    }

    async getAccountInfo(address) {
        const resp = (await this.#handleClientRequest({ command: 'account_info', account: address }));
        return resp?.result?.account_data;
    }

    async getServerDefinition() {
        const resp = (await this.#handleClientRequest({ command: 'server_definitions' }));
        return resp?.result;
    }

    async getServerInfo() {
        const resp = (await this.#handleClientRequest({ command: 'server_info' }));
        return resp?.result;
    }

    async getAccountObjects(address, options) {
        return this.#requestWithPaging({ command: 'account_objects', account: address, ...options }, API_REQ_TYPE.ACCOUNT_OBJECTS);
    }

    async getNamespaceEntries(address, namespaceId, options) {
        return this.#requestWithPaging({ command: 'account_namespace', account: address, namespace_id: namespaceId, ...options }, API_REQ_TYPE.NAMESPACE_ENTRIES);
    }

    async getNftOffers(address, options) {
        const offers = await this.getAccountObjects(address, options);
        // TODO: Pass rippled filter parameter when xrpl.js supports it.
        return offers.filter(o => o.LedgerEntryType == 'NFTokenOffer');
    }

    async getTrustlines(address, options) {
        return this.#requestWithPaging({ command: 'account_lines', account: address, ledger_index: "validated", ...options }, API_REQ_TYPE.LINES);
    }

    async getAccountTrx(address, options) {
        return this.#requestWithPaging({ command: 'account_tx', account: address, ...options }, API_REQ_TYPE.TRANSACTIONS);
    }

    async getNfts(address, options) {
        return this.#requestWithPaging({ command: 'account_nfts', account: address, ledger_index: "validated", ...options }, API_REQ_TYPE.ACCOUNT_NFTS);
    }

    async getOffers(address, options) {
        return this.#requestWithPaging({ command: 'account_offers', account: address, ledger_index: "validated", ...options }, API_REQ_TYPE.OFFERS);
    }

    async getSellOffers(nfTokenId, options = {}) {
        return this.#requestWithPaging({ command: 'nft_sell_offers', nft_id: nfTokenId, ledger_index: "validated", ...options }, API_REQ_TYPE.OFFERS);
    }

    async getBuyOffers(nfTokenId, options = {}) {
        return this.#requestWithPaging({ command: 'nft_buy_offers', nft_id: nfTokenId, ledger_index: "validated", ...options }, API_REQ_TYPE.OFFERS);
    }

    async getLedgerEntry(index, options) {
        try {
            const resp = (await this.#handleClientRequest({ command: 'ledger_entry', index: index, ledger_index: "validated", ...options }));
            return resp?.result?.node;

        } catch (e) {
            if (e?.data?.error === 'entryNotFound')
                return null;
            throw e;
        }
    }

    async getTxnInfo(txnHash, options) {
        const resp = (await this.#handleClientRequest({ command: 'tx', transaction: txnHash, binary: false, ...options }));
        return resp?.result;
    }

    async subscribeToAddress(address, handler) {
        this.#addressSubscriptions.push({ address: address, handler: handler });
        await this.#handleClientRequest({ command: 'subscribe', accounts: [address] });
    }

    async unsubscribeFromAddress(address, handler) {
        for (let i = this.#addressSubscriptions.length - 1; i >= 0; i--) {
            const sub = this.#addressSubscriptions[i];
            if (sub.address === address && sub.handler === handler)
                this.#addressSubscriptions.splice(i, 1);
        }
        await this.#handleClientRequest({ command: 'unsubscribe', accounts: [address] });
    }

    async getTransactionFee(txBlob) {
        const fees = await this.#handleClientRequest({ command: 'fee', tx_blob: txBlob });
        return fees?.result?.drops?.base_fee;
    }

    async #subscribeToStream(streamName) {
        await this.#handleClientRequest({ command: 'subscribe', streams: [streamName] });
    }

    /**
     * Get the transaction results if validated.
     * @param {string} txHash Hash of the transaction to check.
     * @returns Validated results of the transaction.
     */
    async getTransactionValidatedResults(txHash) {
        const txResponse = await this.getTxnInfo(txHash)
            .catch((e) => {
                return null;
            });

        if (txResponse?.validated) {
            return {
                id: txResponse?.hash,
                code: txResponse?.meta?.TransactionResult,
                details: txResponse
            };
        }

        return null;
    }

    /**
     * Watching to acquire the transaction submission. (Waits until txn. is applied to the ledger.)
     * @param {string} txHash Transaction Hash
     * @param {number} lastLedger Last ledger sequence of the transaction.
     * @param {object} submissionResult Result of the submission.
     * @returns Returns the applied transaction object.
     */
    async #waitForFinalTransactionOutcome(txHash, lastLedger, submissionResult) {
        if (lastLedger == null)
            throw 'Transaction must contain a LastLedgerSequence value for reliable submission.';

        await new Promise(r => setTimeout(r, RESPONSE_WATCH_TIMEOUT));

        const latestLedger = await this.#getLedgerIndex();

        if (lastLedger < latestLedger) {
            throw {
                status: 'TOOK_LONG',
                error: `The latest ledger sequence ${latestLedger} is greater than the transaction's LastLedgerSequence (${lastLedger})`,
                ...submissionResult
            };
        }

        const txResponse = await this.getTxnInfo(txHash)
            .catch(async (error) => {
                const message = error?.data?.error;
                if (message === 'txnNotFound') {
                    return await this.#waitForFinalTransactionOutcome(
                        txHash,
                        lastLedger,
                        submissionResult
                    );
                }
                throw `${message} \n Preliminary result: ${JSON.stringify(submissionResult, null, 2)}.\nFull error details: ${JSON.stringify(error, null, 2)}`;
            });

        if (txResponse.validated)
            return txResponse;

        return await this.#waitForFinalTransactionOutcome(txHash, lastLedger, submissionResult);
    }

    /**
     * Arrange the transaction result to a standard format.
     * @param {object} tx Submitted Transaction
     * @param {object} submissionResult Response related to that transaction.
     * @returns prepared response of the transaction result.
     */
    async #prepareResponse(tx, submissionResult) {
        const result = await this.#waitForFinalTransactionOutcome(submissionResult.result.tx_json.hash, tx.LastLedgerSequence, submissionResult);
        const txResult = {
            id: result?.hash,
            code: result?.meta?.TransactionResult,
            details: result
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
            return { ...txResult, ...(hookExecRes ? { hookExecutionResult: hookExecRes } : {}) };
        else
            throw { ...txResult, ...(hookExecRes ? { hookExecutionResult: hookExecRes } : {}) };
    }

    /**
     * Submit a multi-signature transaction and wait for validation.
     * @param {object} tx Multi-signed transaction object.
     * @param {object} submissionRef [Optional] Reference object to take submission references.
     * @returns response object of the validated transaction.
     */
    async submitMultisignedAndWait(tx, submissionRef = {}) {
        tx.SigningPubKey = "";
        submissionRef.submissionResult = await this.#handleClientRequest({ command: 'submit_multisigned', tx_json: tx });
        return await this.#prepareResponse(tx, submissionRef.submissionResult);
    }

    /**
     * Only submit a multi-signature transaction.
     * @param {object} tx Multi-signed transaction object.
     * @returns response object of the submitted transaction.
     */
    async submitMultisigned(tx) {
        tx.SigningPubKey = "";
        return await this.#handleClientRequest({ command: 'submit_multisigned', tx_json: tx });
    }

    /**
     * Submit a single-signature transaction.
     * @param {string} tx_blob Signed transaction object.
     * @param {object} submissionRef [Optional] Reference object to take submission references.
     * @returns response object of the validated transaction.
     */
    async submitAndWait(tx, tx_blob, submissionRef = {}) {
        submissionRef.submissionResult = await this.#handleClientRequest({ command: 'submit', tx_blob: tx_blob });
        return await this.#prepareResponse(tx, submissionRef.submissionResult);
    }

    /**
     * Only submit a single-signature transaction.
     * @param {string} tx_blob Signed transaction object.
     * @returns response object of the submitted transaction.
     */
    async submit(tx_blob) {
        return await this.#handleClientRequest({ command: 'submit', tx_blob: tx_blob });
    }

    /**
     * Join the given the array of signed transactions into one multi-signed transaction.
     * For more details: https://js.xrpl.org/functions/multisign.html 
     * 
     * @param {(string | Transaction)[]} transactions An array of signed Transactions (in object or blob form) to combine into a single signed Transaction.
     * @returns A single signed Transaction string which has all Signers from transactions within it.
     */
    multiSign(transactions) {
        if (transactions.length > 0) {
            return xrpl.multisign(transactions);
        } else
            throw ("Transaction list is empty for multi-signing.");
    }
}

module.exports = {
    XrplApi
}
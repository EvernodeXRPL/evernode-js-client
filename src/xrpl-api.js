const xrpl = require('xrpl');
const kp = require('ripple-keypairs');
const { EventEmitter } = require('./event-emitter');
const { DefaultValues } = require('./defaults');
const { TransactionHelper } = require('./transaction-helper');
const { XrplApiEvents } = require('./xrpl-common');
const { XrplAccount } = require('./xrpl-account');

const MAX_PAGE_LIMIT = 400;
const API_REQ_TYPE = {
    NAMESPACE_ENTRIES: 'namespace_entries',
    ACCOUNT_OBJECTS: 'account_objects',
    LINES: 'lines',
    ACCOUNT_NFTS: 'account_nfts',
    OFFERS: 'offers',
    TRANSACTIONS: 'transactions'
}

const LEDGER_CLOSE_TIME = 1000

class XrplApi {

    #rippledServer;
    #client;
    #events = new EventEmitter();
    #addressSubscriptions = [];
    #maintainConnection = false;
    #handleConnectionFailures;

    constructor(rippledServer = null, options = {}) {

        this.#rippledServer = rippledServer || DefaultValues.rippledServer;
        this.#initXrplClient(options.xrplClientOptions);
        this.#handleConnectionFailures = options.handleConnectionFailures || true;
    }

    async #initXrplClient(xrplClientOptions = {}) {

        if (this.#client) { // If the client already exists, clean it up.
            this.#client.removeAllListeners(); // Remove existing event listeners to avoid them getting called from the old client object.
            await this.#client.disconnect();
            this.#client = null;
        }
        // await new Promise(r =>  setTimeout(r,5000))
        this.#client = new xrpl.Client(this.#rippledServer, xrplClientOptions);
        console.log("client connected")

        this.#client.on('error', (errorCode, errorMessage) => {
            console.log(errorCode + ': ' + errorMessage);
        });

        this.#client.on('disconnected', (code) => {
            if (this.#handleConnectionFailures && this.#maintainConnection) {
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
            console.log("BR-0");
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
                    }; // Create an object copy. Otherwise xrpl client will mutate the transaction object,
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

            if (this.#handleConnectionFailures) {
                console.log("BR1")
                if (this.#handleConnectionFailures && this.#maintainConnection) {
                    console.log(`Connection failure for ${this.#rippledServer} (code:${"Test"})`);
                    console.log("Reinitializing xrpl client.");
                    this.#initXrplClient().then(() => this.#connectXrplClient(true));
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
            resp = (await this.#client.request(requestObj));
            if (resp?.result && resp?.result[requestType])
                res.push(...resp.result[requestType]);
            if (count)
                count -= requestObj.limit;
        }

        return res;
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

    async isAccountExists(address) {
        try {
            await this.#client.request({ command: 'account_info', account: address });
            return true;
        }
        catch (e) {
            if (e.data.error === 'actNotFound') return false;
            else throw e;
        }
    }

    async getAccountInfo(address) {
        const resp = (await this.#client.request({ command: 'account_info', account: address }));
        return resp?.result?.account_data;
    }

    async getServerDefinition() {
        const resp = (await this.#client.request({ command: 'server_definitions' }));
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
            const resp = (await this.#client.request({ command: 'ledger_entry', index: index, ledger_index: "validated", ...options }));
            return resp?.result?.node;

        } catch (e) {
            if (e?.data?.error === 'entryNotFound')
                return null;
            throw e;
        }
    }

    async getTxnInfo(txnHash, options) {
        const resp = (await this.#client.request({ command: 'tx', transaction: txnHash, binary: false, ...options }));
        return resp?.result;
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

    async getTransactionFee(txBlob) {
        const fees = await this.#client.request({ command: 'fee', tx_blob: txBlob });
        return fees?.result?.drops?.base_fee;
    }

    async #subscribeToStream(streamName) {
        await this.#client.request({ command: 'subscribe', streams: [streamName] });
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

        await new Promise(r => setTimeout(r, LEDGER_CLOSE_TIME));

        const latestLedger = await this.#client.getLedgerIndex();

        if (lastLedger < latestLedger) {
            throw `The latest ledger sequence ${latestLedger} is greater than the transaction's LastLedgerSequence (${lastLedger}).\n` +
            `Preliminary result: ${JSON.stringify(submissionResult, null, 2)}`;
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
        const resultCode = submissionResult?.result?.engine_result;
        if (resultCode === "tesSUCCESS" || resultCode === "tefPAST_SEQ" || resultCode === "tefALREADY") {
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
        else
            throw resultCode ? `Transaction failed with error ${resultCode}` : 'Transaction failed';

    }

    /**
     * Submit a multi-signature transaction and wait for validation.
     * @param {object} tx Multi-signed transaction object.
     * @returns response object of the validated transaction.
     */
    async submitMultisignedAndWait(tx) {
        tx.SigningPubKey = "";
        const submissionResult = await this.#client.request({ command: 'submit_multisigned', tx_json: tx });
        return await this.#prepareResponse(tx, submissionResult);
    }

    /**
     * Only submit a multi-signature transaction.
     * @param {object} tx Multi-signed transaction object.
     * @returns response object of the submitted transaction.
     */
    async submitMultisigned(tx) {
        tx.SigningPubKey = "";
        return await this.#client.request({ command: 'submit_multisigned', tx_json: tx });
    }

    /**
     * Submit a single-signature transaction.
     * @param {string} tx_blob Signed transaction object.
     * @returns response object of the validated transaction.
     */
    async submitAndWait(tx, tx_blob) {
        const submissionResult = await this.#client.request({ command: 'submit', tx_blob: tx_blob });
        return await this.#prepareResponse(tx, submissionResult);
    }

    /**
     * Only submit a single-signature transaction.
     * @param {string} tx_blob Signed transaction object.
     * @returns response object of the submitted transaction.
     */
    async submit(tx_blob) {
        return await this.#client.request({ command: 'submit', tx_blob: tx_blob });
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
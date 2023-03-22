const codec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { XrplApi } = require('../xrpl-api');
const { XrplAccount } = require('../xrpl-account');
const { XrplApiEvents, XrplConstants } = require('../xrpl-common');
const { EvernodeEvents, MemoTypes, MemoFormats, EvernodeConstants, HookStateKeys } = require('../evernode-common');
const { DefaultValues } = require('../defaults');
const { EncryptionHelper } = require('../encryption-helper');
const { EventEmitter } = require('../event-emitter');
const { UtilHelpers } = require('../util-helpers');
const { FirestoreHandler } = require('../firestore/firestore-handler');
const { StateHelpers } = require('../state-helpers');
const { EvernodeHelpers } = require('../evernode-helpers');
const { HookHelpers } = require('../hook-helpers');

const CANDIDATE_PROPOSE_UNIQUE_ID_MEMO_OFFSET = 0;
const CANDIDATE_PROPOSE_SHORT_NAME_MEMO_OFFSET = 32;
const CANDIDATE_PROPOSE_KEYLETS_MEMO_OFFSET = 52;
const CANDIDATE_PROPOSE_MEMO_SIZE = 154;

const DUD_HOST_CANDID_ADDRESS_OFFSET = 12;

class BaseEvernodeClient {

    #watchEvents;
    #autoSubscribe;
    #ownsXrplApi = false;
    #firestoreHandler;

    constructor(xrpAddress, xrpSecret, watchEvents, autoSubscribe = false, options = {}) {

        this.connected = false;
        this.governorAddress = options.governorAddress || DefaultValues.governorAddress;

        this.xrplApi = options.xrplApi || DefaultValues.xrplApi || new XrplApi(options.rippledServer);
        if (!options.xrplApi && !DefaultValues.xrplApi)
            this.#ownsXrplApi = true;

        this.xrplAcc = new XrplAccount(xrpAddress, xrpSecret, { xrplApi: this.xrplApi });
        this.accKeyPair = xrpSecret && this.xrplAcc.deriveKeypair();
        this.#watchEvents = watchEvents;
        this.#autoSubscribe = autoSubscribe;
        this.events = new EventEmitter();
        this.#firestoreHandler = new FirestoreHandler()

        this.xrplAcc.on(XrplApiEvents.PAYMENT, (tx, error) => this.#handleEvernodeEvent(tx, error));
        this.xrplAcc.on(XrplApiEvents.URI_TOKEN_BUY, (tx, error) => this.#handleEvernodeEvent(tx, error));
        this.xrplAcc.on(XrplApiEvents.URI_TOKEN_CREATE_SELL_OFFER, (tx, error) => this.#handleEvernodeEvent(tx, error));
    }

    /**
     * Listens to the subscribed events. This will listen for the event without detaching the handler until it's 'off'.
     * @param {string} event Event name.
     * @param {function(event)} handler Callback function to handle the event.
     */
    on(event, handler) {
        this.events.on(event, handler);
    }

    /**
    * Listens to the subscribed events. This will listen only once and detach the handler.
    * @param {string} event Event name.
    * @param {function(event)} handler Callback function to handle the event.
    */
    once(event, handler) {
        this.events.once(event, handler);
    }

    /**
     * Detach the listener event.
     * @param {string} event Event name.
     * @param {function(event)} handler (optional) Can be sent if a specific handler need to be detached. All the handlers will be detached if not specified.
     */
    off(event, handler = null) {
        this.events.off(event, handler);
    }

    /**
     * Connects the client to xrpl server and do the config loading and subscriptions. 'subscribe' is called inside this.
     * @returns boolean value, 'true' if success.
     */
    async connect() {
        if (this.connected)
            return true;

        await this.xrplApi.connect();

        // Invoking the info command to check the account existence. This is important to 
        // identify a network reset from XRPL. 
        await this.xrplAcc.getInfo();

        this.config = await this.#getEvernodeConfig();
        this.connected = true;

        if (this.#autoSubscribe)
            await this.subscribe();

        return true;
    }

    /**
     * Disconnects the client to xrpl server and do the un-subscriptions. 'unsubscribe' is called inside this.
     */
    async disconnect() {
        await this.unsubscribe();

        if (this.#ownsXrplApi)
            await this.xrplApi.disconnect();
    }

    /**
     * Subscribes to the client events.
     */
    async subscribe() {
        await this.xrplAcc.subscribe();
    }

    /**
     * Unsubscribes from the client events.
     */
    async unsubscribe() {
        await this.xrplAcc.unsubscribe();
    }

    /**
     * Get the EVR balance in the account.
     * @returns The available EVR amount as a 'string'.
     */
    async getEVRBalance() {
        const lines = await this.xrplAcc.getTrustLines(EvernodeConstants.EVR, this.config.evrIssuerAddress);
        if (lines.length > 0)
            return lines[0].balance;
        else
            return '0';
    }

    /**
     * Get all XRPL hook states in the registry account.
     * @returns The list of hook states including Evernode configuration and hosts.
     */
    async getHookStates() {
        const regAcc = new XrplAccount(this.governorAddress, null, { xrplApi: this.xrplApi });
        const configs = await regAcc.getNamespaceEntries(EvernodeConstants.HOOK_NAMESPACE);

        if (configs)
            return configs.filter(c => c.LedgerEntryType === 'HookState').map(c => { return { key: c.HookStateKey, data: c.HookStateData } });
        return [];
    }

    /**
     * Get the moment from the given index (timestamp).
     * @param {number} index [Optional] Index (timestamp) to get the moment value.
     * @returns The moment of the given index (timestamp) as 'number'. Returns current moment if index (timestamp) is not given.
     */
    async getMoment(index = null) {
        const i = index || UtilHelpers.getCurrentUnixTime();
        const m = this.config.momentBaseInfo.baseTransitionMoment + Math.floor((i - this.config.momentBaseInfo.baseIdx) / this.config.momentSize);
        await Promise.resolve();
        return m;
    }

    /**
     * Get start index (timestamp) of the moment.
     * @param {number} index [Optional] Index (timestamp) to get the moment value.
     * @returns The index (timestamp) of the moment as a 'number'. Returns the current moment's start index (timestamp) if ledger index parameter is not given.
     */
    async getMomentStartIndex(index = null) {
        const i = index || UtilHelpers.getCurrentUnixTime();

        const m = Math.floor((i - this.config.momentBaseInfo.baseIdx) / this.config.momentSize);

        await Promise.resolve(); // Awaiter placeholder for future async requirements.
        return this.config.momentBaseInfo.baseIdx + (m * this.config.momentSize);
    }

    /**
     * Get Evernode configuration
     * @returns An object with all the configuration and their values.
     */
    async #getEvernodeConfig() {
        let states = await this.getHookStates();
        const configStateKeys = {
            registryAddress: HookStateKeys.REGISTRY_ADDR,
            heartbeatAddress: HookStateKeys.HEARTBEAT_ADDR,
            evrIssuerAddress: HookStateKeys.EVR_ISSUER_ADDR,
            foundationAddress: HookStateKeys.FOUNDATION_ADDR,
            hostRegFee: HookStateKeys.HOST_REG_FEE,
            momentSize: HookStateKeys.MOMENT_SIZE,
            hostHeartbeatFreq: HookStateKeys.HOST_HEARTBEAT_FREQ,
            momentBaseInfo: HookStateKeys.MOMENT_BASE_INFO,
            leaseAcquireWindow: HookStateKeys.LEASE_ACQUIRE_WINDOW,
            rewardInfo: HookStateKeys.REWARD_INFO,
            rewardConfiguration: HookStateKeys.REWARD_CONFIGURATION,
            hostCount: HookStateKeys.HOST_COUNT,
            momentTransitInfo: HookStateKeys.MOMENT_TRANSIT_INFO,
            registryMaxTrxEmitFee: HookStateKeys.MAX_TRX_EMISSION_FEE,
            governanceConfiguration: HookStateKeys.GOVERNANCE_CONFIGURATION,
            governanceInfo: HookStateKeys.GOVERNANCE_INFO
        }
        let config = {};
        for (const [key, value] of Object.entries(configStateKeys)) {
            const stateKey = Buffer.from(value, 'hex');
            const stateDataBin = StateHelpers.getStateData(states, value);
            if (stateDataBin) {
                const stateData = Buffer.from(StateHelpers.getStateData(states, value), 'hex');
                const decoded = StateHelpers.decodeStateData(stateKey, stateData);
                config[key] = decoded.value;
            }
        }
        return config;
    }

    /**
     * Loads the configs from XRPL hook and updates the in-memory config.
     */
    async refreshConfig() {
        this.config = await this.#getEvernodeConfig();
    }

    /**
     * Extracts transaction info and emits the Evernode event.
     * @param {object} tx XRPL transaction to be handled.
     * @param {any} error Error if there's any.
     */
    async #handleEvernodeEvent(tx, error) {
        if (error)
            console.error(error);
        else if (!tx)
            console.log('handleEvernodeEvent: Invalid transaction.');
        else {
            const ev = await this.extractEvernodeEvent(tx);
            if (ev && this.#watchEvents.find(e => e === ev.name))
                this.events.emit(ev.name, ev.data);
        }
    }

    /**
     * Extracts the transaction info from a given transaction.
     * @param {object} tx Transaction to be deserialized and extracted.
     * @returns The event object in the format {name: '', data: {}}. Returns null if not handled. Note: You need to deserialize memos before passing the transaction to this function.
     */
    async extractEvernodeEvent(tx) {
        if (tx.TransactionType === 'URITokenBuy' && tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.ACQUIRE_LEASE && tx.Memos[0].format === MemoFormats.BASE64 && tx.Memos[0].data) {

            // If our account is the destination host account, then decrypt the payload.
            let payload = tx.Memos[0].data;
            if (tx.Destination === this.xrplAcc.address) {
                const decrypted = this.accKeyPair && await EncryptionHelper.decrypt(this.accKeyPair.privateKey, payload);
                if (decrypted)
                    payload = decrypted;
                else
                    console.log('Failed to decrypt acquire data.');
            }

            return {
                name: EvernodeEvents.AcquireLease,
                data: {
                    transaction: tx,
                    host: tx.Destination,
                    uriTokenId: tx.URITokenSellOffer?.index,
                    leaseAmount: tx.URITokenSellOffer?.Amount?.value,
                    acquireRefId: tx.hash,
                    tenant: tx.Account,
                    payload: payload
                }
            }
        }

        else if (tx.Memos.length >= 2 &&
            tx.Memos[0].type === MemoTypes.ACQUIRE_SUCCESS && tx.Memos[0].data &&
            tx.Memos[1].type === MemoTypes.ACQUIRE_REF && tx.Memos[1].data) {

            let payload = tx.Memos[0].data;
            const acquireRefId = tx.Memos[1].data;

            // If our account is the destination user account, then decrypt the payload.
            if (tx.Memos[0].format === MemoFormats.BASE64 && tx.Destination === this.xrplAcc.address) {
                const decrypted = this.accKeyPair && await EncryptionHelper.decrypt(this.accKeyPair.privateKey, payload);
                if (decrypted)
                    payload = decrypted;
                else
                    console.log('Failed to decrypt instance data.');
            }

            return {
                name: EvernodeEvents.AcquireSuccess,
                data: {
                    transaction: tx,
                    acquireRefId: acquireRefId,
                    payload: payload
                }
            }

        }
        else if (tx.Memos.length >= 2 &&
            tx.Memos[0].type === MemoTypes.ACQUIRE_ERROR && tx.Memos[0].data &&
            tx.Memos[1].type === MemoTypes.ACQUIRE_REF && tx.Memos[1].data) {

            let error = tx.Memos[0].data;
            const acquireRefId = tx.Memos[1].data;

            if (tx.Memos[0].format === MemoFormats.JSON)
                error = JSON.parse(error).reason;

            return {
                name: EvernodeEvents.AcquireError,
                data: {
                    transaction: tx,
                    acquireRefId: acquireRefId,
                    reason: error
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.HOST_REG && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            return {
                name: EvernodeEvents.HostRegistered,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (tx.Memos.length >= 1 && tx.Memos[0].type === MemoTypes.HOST_DEREG) {
            return {
                name: EvernodeEvents.HostDeregistered,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.HEARTBEAT) {

            const voteInfo = (tx.Memos[0].data && tx.Memos[0].data.length) ?
                {
                    voteInfo: {
                        candidateId: tx.Memos[0].data.substr(0, 64),
                        vote: Buffer.from(tx.Memos[0].data, 'hex').slice(32, 33).readUInt8()
                    }
                } : {};

            return {
                name: EvernodeEvents.Heartbeat,
                data: {
                    transaction: tx,
                    host: tx.Account,
                    ...voteInfo
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.EXTEND_LEASE && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            let uriTokenId = tx.Memos[0].data;

            return {
                name: EvernodeEvents.ExtendLease,
                data: {
                    transaction: tx,
                    extendRefId: tx.hash,
                    tenant: tx.Account,
                    currency: tx.Amount.currency,
                    payment: parseFloat(tx.Amount.value),
                    uriTokenId: uriTokenId
                }
            }
        }
        else if (tx.Memos.length >= 2 &&
            tx.Memos[0].type === MemoTypes.EXTEND_SUCCESS && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data &&
            tx.Memos[1].type === MemoTypes.EXTEND_REF && tx.Memos[1].format === MemoFormats.HEX && tx.Memos[1].data) {

            const extendResBuf = Buffer.from(tx.Memos[0].data, 'hex');
            const extendRefId = tx.Memos[1].data;

            return {
                name: EvernodeEvents.ExtendSuccess,
                data: {
                    transaction: tx,
                    extendRefId: extendRefId,
                    expiryMoment: extendResBuf.readUInt32BE()
                }
            }

        }
        else if (tx.Memos.length >= 2 &&
            tx.Memos[0].type === MemoTypes.EXTEND_ERROR && tx.Memos[0].data &&
            tx.Memos[1].type === MemoTypes.EXTEND_REF && tx.Memos[1].data) {

            let error = tx.Memos[0].data;
            const extendRefId = tx.Memos[1].data;

            if (tx.Memos[0].format === MemoFormats.JSON)
                error = JSON.parse(error).reason;

            return {
                name: EvernodeEvents.ExtendError,
                data: {
                    transaction: tx,
                    extendRefId: extendRefId,
                    reason: error
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.INIT && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            return {
                name: EvernodeEvents.Initialized,
                data: {
                    transaction: tx
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.HOST_UPDATE_INFO && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            return {
                name: EvernodeEvents.HostRegUpdated,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.DEAD_HOST_PRUNE && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            const addrsBuf = Buffer.from(tx.Memos[0].data, 'hex');

            return {
                name: EvernodeEvents.DeadHostPrune,
                data: {
                    transaction: tx,
                    host: codec.encodeAccountID(addrsBuf)
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.HOST_REBATE) {

            return {
                name: EvernodeEvents.HostRebate,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.HOST_TRANSFER && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            const addrsBuf = Buffer.from(tx.Memos[0].data, 'hex');

            return {
                name: EvernodeEvents.HostTransfer,
                data: {
                    transaction: tx,
                    transferee: codec.encodeAccountID(addrsBuf)
                }
            }
        }
        else if (tx.Memos.length >= 2 &&
            tx.Memos[0].type === MemoTypes.CANDIDATE_PROPOSE && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data &&
            tx.Memos[1].type === MemoTypes.CANDIDATE_PROPOSE_REF && tx.Memos[1].format === MemoFormats.HEX && tx.Memos[1].data) {

            return {
                name: EvernodeEvents.CandidateProposed,
                data: {
                    transaction: tx,
                    owner: tx.Account,
                    candidateId: tx.Memos[1].data.substr(0, 64)
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.CANDIDATE_WITHDRAW && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {
            return {
                name: EvernodeEvents.CandidateWithdrew,
                data: {
                    transaction: tx,
                    owner: tx.Account,
                    candidateId: tx.Memos[0].data.substr(0, 64)
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.CANDIDATE_STATUS_CHANGE && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {
            const memoBuf = Buffer.from(tx.Memos[0].data, 'hex');
            const candidateId = memoBuf.slice(0, 32).toString('hex');
            const candidateType = StateHelpers.getCandidateType(candidateId);

            switch (candidateType) {
                case (EvernodeConstants.CandidateTypes.DudHost):
                    return {
                        name: memoBuf.readUInt8(32) === EvernodeConstants.CandidateStatuses.CANDIDATE_ELECTED ? EvernodeEvents.DudHostRemoved : EvernodeEvents.DudHostStatusChanged,
                        data: {
                            transaction: tx,
                            candidateId: candidateId,
                            host: codec.encodeAccountID(Buffer.from(candidateId, 'hex').slice(DUD_HOST_CANDID_ADDRESS_OFFSET, 32))
                        }
                    }
                case (EvernodeConstants.CandidateTypes.PilotedMode):
                    return {
                        name: EvernodeEvents.FallbackToPiloted,
                        data: {
                            transaction: tx,
                            candidateId: candidateId,
                        }
                    }
                case (EvernodeConstants.CandidateTypes.NewHook):
                    return {
                        name: EvernodeEvents.NewHookStatusChanged,
                        data: {
                            transaction: tx,
                            candidateId: candidateId,
                        }
                    }
                default:
                    return null;
            }

        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.HOOK_UPDATE_RES && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {
            return {
                name: EvernodeEvents.ChildHookUpdated,
                data: {
                    transaction: tx,
                    account: tx.Account,
                    candidateId: tx.Memos[0].data.substr(0, 64)
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.GOVERNANCE_MODE_CHANGE && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {
            const mode = Buffer.from(tx.Memos[0].data, 'hex').slice(0, 1).readUInt8();

            return {
                name: EvernodeEvents.GovernanceModeChanged,
                data: {
                    transaction: tx,
                    mode: mode
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.CANDIDATE_VOTE && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {
            const vote = Buffer.from(tx.Memos[0].data, 'hex').slice(32, 33).readUInt8();

            return {
                name: EvernodeEvents.FoundationVoted,
                data: {
                    transaction: tx,
                    candidateId: tx.Memos[0].data.substr(0, 64),
                    vote: vote
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.DUD_HOST_REPORT && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {
            const candidateId = tx.Memos[0].data.substr(0, 64);

            return {
                name: EvernodeEvents.DudHostReported,
                data: {
                    transaction: tx,
                    candidateId: candidateId,
                    host: codec.encodeAccountID(Buffer.from(candidateId, 'hex').slice(DUD_HOST_CANDID_ADDRESS_OFFSET, 32))
                }
            }
        }

        return null;
    }

    /**
     * Get the registered host information.
     * @param {string} hostAddress [Optional] Address of the host.
     * @returns The registered host information object. Returns null if not registered.
     */
    async getHostInfo(hostAddress = this.xrplAcc.address) {
        try {
            const addrStateKey = StateHelpers.generateHostAddrStateKey(hostAddress);
            const addrStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, addrStateKey);
            const addrLedgerEntry = await this.xrplApi.getLedgerEntry(addrStateIndex);
            const addrStateData = addrLedgerEntry?.HookStateData;
            if (addrStateData) {
                const addrStateDecoded = StateHelpers.decodeHostAddressState(Buffer.from(addrStateKey, 'hex'), Buffer.from(addrStateData, 'hex'));
                const curMomentStartIdx = await this.getMomentStartIndex();
                addrStateDecoded.active = (addrStateDecoded.lastHeartbeatIndex > (this.config.hostHeartbeatFreq * this.config.momentSize) ?
                    (addrStateDecoded.lastHeartbeatIndex >= (curMomentStartIdx - (this.config.hostHeartbeatFreq * this.config.momentSize))) :
                    (addrStateDecoded.lastHeartbeatIndex > 0))

                const tokenIdStatekey = StateHelpers.generateTokenIdStateKey(addrStateDecoded.uriTokenId);
                const tokenIdStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, tokenIdStatekey);
                const tokenIdLedgerEntry = await this.xrplApi.getLedgerEntry(tokenIdStateIndex);

                const tokenIdStateData = tokenIdLedgerEntry?.HookStateData;
                if (tokenIdStateData) {
                    const tokenIdStateDecoded = StateHelpers.decodeTokenIdState(Buffer.from(tokenIdStateData, 'hex'));
                    return { ...addrStateDecoded, ...tokenIdStateDecoded };
                }
            }
        }
        catch (e) {
            // If the exception is entryNotFound from Rippled there's no entry for the host, So return null.
            if (e?.data?.error !== 'entryNotFound')
                throw e;
        }

        return null;
    }

    /**
     * Get all the hosts registered in Evernode. The result's are paginated. Default page size is 20. Note: Specifying both filter and pagination does not supported.
     * @param {object} filters [Optional] Filter criteria to filter the hosts. The filter key can be a either property of the host.
     * @param {number} pageSize [Optional] Page size for the results.
     * @param {string} nextPageToken [Optional] Next page's token, If received by the previous result set.
     * @returns The list of active hosts. The response will be in '{data: [], nextPageToken: ''}' only if there are more pages. Otherwise the response will only contain the host list. 
     */
    async getHosts(filters = null, pageSize = null, nextPageToken = null) {
        const hosts = await this.#firestoreHandler.getHosts(filters, pageSize, nextPageToken);
        const curMomentStartIdx = await this.getMomentStartIndex();
        const res = await Promise.all((hosts.nextPageToken ? hosts.data : hosts).map(async host => {
            const hostAcc = new XrplAccount(host.address);
            host.domain = await hostAcc.getDomain();

            host.active = (host.lastHeartbeatIndex > (this.config.hostHeartbeatFreq * this.config.momentSize) ?
                (host.lastHeartbeatIndex >= (curMomentStartIdx - (this.config.hostHeartbeatFreq * this.config.momentSize))) :
                (host.lastHeartbeatIndex > 0));
            return host;
        }));

        return (hosts.nextPageToken ? { ...hosts, data: res } : res);
    }

    /**
     * Get all the candidates proposed in Evernode. The result's are paginated. Default page size is 20. Note: Specifying both filter and pagination does not supported.
     * @param {object} filters [Optional] Filter criteria to filter the hosts. The filter key can be a either property of the host.
     * @param {number} pageSize [Optional] Page size for the results.
     * @param {string} nextPageToken [Optional] Next page's token, If received by the previous result set.
     * @returns The list of candidates. The response will be in '{data: [], nextPageToken: ''}' only if there are more pages. Otherwise the response will only contain the host list. 
     */
    async getCandidates(filters = null, pageSize = null, nextPageToken = null) {
        const candidates = await this.#firestoreHandler.getCandidates(filters, pageSize, nextPageToken);
        return candidates;
    }

    /**
     * Get all Evernode configuration without paginating.
     * @returns The list of configuration.
     */
    async getAllConfigs() {
        let fullConfigList = [];
        const configs = await this.#firestoreHandler.getConfigs();
        if (configs.nextPageToken) {
            let currentPageToken = configs.nextPageToken;
            let nextConfigs = null;
            fullConfigList = fullConfigList.concat(configs.data);
            while (currentPageToken) {
                nextConfigs = await this.#firestoreHandler.getConfigs(null, 50, currentPageToken);
                fullConfigList = fullConfigList.concat(nextConfigs.nextPageToken ? nextConfigs.data : nextConfigs);
                currentPageToken = nextConfigs.nextPageToken;
            }
        } else {
            fullConfigList = fullConfigList.concat(configs);
        }

        return fullConfigList;
    }

    /**
     * Get all the hosts without paginating.
     * @returns The list of hosts.
     */
    async getAllHosts() {
        let fullHostList = [];
        const hosts = await this.#firestoreHandler.getHosts();
        if (hosts.nextPageToken) {
            let currentPageToken = hosts.nextPageToken;
            let nextHosts = null;
            fullHostList = fullHostList.concat(hosts.data);
            while (currentPageToken) {
                nextHosts = await this.#firestoreHandler.getHosts(null, 50, currentPageToken);
                fullHostList = fullHostList.concat(nextHosts.nextPageToken ? nextHosts.data : nextHosts);
                currentPageToken = nextHosts.nextPageToken;
            }
        } else {
            fullHostList = fullHostList.concat(hosts);
        }

        return fullHostList;
    }

    /**
     * Get all the candidates without paginating.
     * @returns The list of candidates.
     */
    async getAllCandidates() {
        let fullCandidateList = [];
        const candidates = await this.#firestoreHandler.getCandidates();
        if (candidates.nextPageToken) {
            let currentPageToken = candidates.nextPageToken;
            let nextCandidates = null;
            fullCandidateList = fullCandidateList.concat(candidates.data);
            while (currentPageToken) {
                nextCandidates = await this.#firestoreHandler.getCandidates(null, 50, currentPageToken);
                fullCandidateList = fullCandidateList.concat(nextCandidates.nextPageToken ? nextCandidates.data : nextCandidates);
                currentPageToken = nextCandidates.nextPageToken;
            }
        } else {
            fullCandidateList = fullCandidateList.concat(candidates);
        }

        return fullCandidateList;
    }

    /**
     * Remove a host which is inactive for a long period. The inactivity is checked by Evernode it self and only pruned if inactive thresholds are met.
     * @param {string} hostAddress XRPL address of the host to be pruned.
     */
    async pruneDeadHost(hostAddress) {
        if (this.xrplAcc.address === this.config.registryAddress)
            throw 'Invalid function call';

        let memoData = Buffer.allocUnsafe(20);
        codec.decodeAccountID(hostAddress).copy(memoData);

        // To obtain registration NFT Page Keylet and index.
        const hostAcc = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
        const regUriToken = (await hostAcc.getURITokens()).find(n => n.URI.startsWith(EvernodeConstants.TOKEN_PREFIX_HEX) && n.Issuer === this.config.registryAddress);
        if (regUriToken) {
            await this.xrplAcc.makePayment(this.config.registryAddress,
                XrplConstants.MIN_XRP_AMOUNT,
                XrplConstants.XRP,
                null,
                [
                    { type: MemoTypes.DEAD_HOST_PRUNE, format: MemoFormats.HEX, data: memoData.toString('hex') }
                ]);
        } else
            throw "No Registration URI token was found for the Host account."

    }

    /**
     * Get proposed candidate info.
     * @param {string} ownerAddress [Optional] Address of the owner.
     * @returns The candidate information. Returns null if no candidate.
     */
    async getCandidateByOwner(ownerAddress = this.xrplAcc.address) {
        try {
            const ownerStateKey = StateHelpers.generateCandidateOwnerStateKey(ownerAddress);
            const ownerStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, ownerStateKey);
            const ownerLedgerEntry = await this.xrplApi.getLedgerEntry(ownerStateIndex);
            const ownerStateData = ownerLedgerEntry?.HookStateData;
            if (ownerStateData) {
                const ownerStateDecoded = StateHelpers.decodeCandidateOwnerState(Buffer.from(ownerStateKey, 'hex'), Buffer.from(ownerStateData, 'hex'));

                const idStateKey = StateHelpers.generateCandidateIdStateKey(ownerStateDecoded.uniqueId);
                const idStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, idStateKey);
                const idLedgerEntry = await this.xrplApi.getLedgerEntry(idStateIndex);

                const idStateData = idLedgerEntry?.HookStateData;
                if (idStateData) {
                    const idStateDecoded = StateHelpers.decodeCandidateIdState(Buffer.from(idStateData, 'hex'));
                    return { ...ownerStateDecoded, ...idStateDecoded };
                }
            }
        }
        catch (e) {
            // If the exception is entryNotFound from Rippled there's no entry for the host, So return null.
            if (e?.data?.error !== 'entryNotFound')
                throw e;
        }

        return null;
    }

    /**
     * Get proposed candidate info.
     * @param {string} candidateId Id of the candidate.
     * @returns The candidate information. Returns null if no candidate.
     */
    async getCandidateById(candidateId) {
        try {
            const idStateKey = StateHelpers.generateCandidateIdStateKey(candidateId);
            const idStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, idStateKey);
            const idLedgerEntry = await this.xrplApi.getLedgerEntry(idStateIndex);
            const idStateData = idLedgerEntry?.HookStateData;
            if (idStateData) {
                const idStateDecoded = StateHelpers.decodeCandidateIdState(Buffer.from(idStateData, 'hex'));

                const ownerStateKey = StateHelpers.generateCandidateOwnerStateKey(idStateDecoded.ownerAddress);
                const ownerStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, ownerStateKey);
                const ownerLedgerEntry = await this.xrplApi.getLedgerEntry(ownerStateIndex);

                const ownerStateData = ownerLedgerEntry?.HookStateData;
                if (ownerStateData) {
                    const ownerStateDecoded = StateHelpers.decodeCandidateOwnerState(Buffer.from(ownerStateKey, 'hex'), Buffer.from(ownerStateData, 'hex'));
                    return { ...ownerStateDecoded, ...idStateDecoded };
                }

                return idStateDecoded;
            }
        }
        catch (e) {
            // If the exception is entryNotFound from Rippled there's no entry for the host, So return null.
            if (e?.data?.error !== 'entryNotFound')
                throw e;
        }

        return null;
    }

    /**
     * Get reported dud host info.
     * @param {string} hostAddress [Optional] Address of the dud host.
     * @returns The dud host candidate information. Returns null if no candidate.
     */
    async getDudHostVoteInfo(hostAddress = this.xrplAcc.address) {
        try {
            const candidateId = StateHelpers.getDudHostCandidateId(hostAddress);
            const idStateKey = StateHelpers.generateCandidateIdStateKey(candidateId);
            const idStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, idStateKey);
            const idLedgerEntry = await this.xrplApi.getLedgerEntry(idStateIndex);

            const idStateData = idLedgerEntry?.HookStateData;
            if (idStateData) {
                const idStateDecoded = StateHelpers.decodeCandidateIdState(Buffer.from(idStateData, 'hex'));
                return idStateDecoded;
            }
        }
        catch (e) {
            // If the exception is entryNotFound from Rippled there's no entry for the host, So return null.
            if (e?.data?.error !== 'entryNotFound')
                throw e;
        }

        return null;
    }

    /**
     * Get piloted mode vote info.
     * @returns The piloted mode candidate information. Returns null if no candidate.
     */
    async getPilotedModeVoteInfo() {
        try {
            const candidateId = StateHelpers.getPilotedModeCandidateId();
            const idStateKey = StateHelpers.generateCandidateIdStateKey(candidateId);
            const idStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, idStateKey);
            const idLedgerEntry = await this.xrplApi.getLedgerEntry(idStateIndex);

            const idStateData = idLedgerEntry?.HookStateData;
            if (idStateData) {
                const idStateDecoded = StateHelpers.decodeCandidateIdState(Buffer.from(idStateData, 'hex'));
                return idStateDecoded;
            }
        }
        catch (e) {
            // If the exception is entryNotFound from Rippled there's no entry for the host, So return null.
            if (e?.data?.error !== 'entryNotFound')
                throw e;
        }

        return null;
    }

    /**
     * Withdraw a hook candidate.
     * @param {*} hashes Hook candidate hashes in hex format, <GOVERNOR_HASH(32)><REGISTRY_HASH(32)><HEARTBEAT_HASH(32)>.
     * @param {*} shortName Short name for the proposal candidate.
     * @param {*} options [Optional] transaction options.
     * @returns Proposed candidate id.
     */
    async _propose(hashes, shortName, options = {}) {
        const hashesBuf = Buffer.from(hashes, 'hex');
        if (!hashesBuf || hashesBuf.length != 96)
            throw 'Invalid hashes: Hashes should contain all three Governor, Registry, Heartbeat hook hashes.';

        // Check whether hook hashes exist in the definition.
        let keylets = [];
        for (const [i, hook] of EvernodeConstants.HOOKS.entries()) {
            const index = HookHelpers.getHookDefinitionIndex(hashes.substr(i * 64, 64));
            const ledgerEntry = await this.xrplApi.getLedgerEntry(index);
            if (!ledgerEntry)
                throw `No hook exists with the specified ${hook} hook hash.`;
            else
                keylets.push(HookHelpers.getHookDefinitionKeylet(index));
        }

        const uniqueId = StateHelpers.getNewHookCandidateId(hashesBuf);
        const memoBuf = Buffer.alloc(CANDIDATE_PROPOSE_MEMO_SIZE);
        Buffer.from(uniqueId, 'hex').copy(memoBuf, CANDIDATE_PROPOSE_UNIQUE_ID_MEMO_OFFSET);
        Buffer.from(shortName.substr(0, 20), "utf-8").copy(memoBuf, CANDIDATE_PROPOSE_SHORT_NAME_MEMO_OFFSET);
        Buffer.from(keylets.join(''), 'hex').copy(memoBuf, CANDIDATE_PROPOSE_KEYLETS_MEMO_OFFSET);

        // Get the proposal fee. Proposal fee is current epochs moment worth of rewards.
        const proposalFee = EvernodeHelpers.getEpochRewardQuota(this.config.rewardInfo.epoch, this.config.rewardConfiguration.firstEpochRewardQuota);

        await this.xrplAcc.makePayment(this.governorAddress,
            proposalFee.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [
                { type: MemoTypes.CANDIDATE_PROPOSE, format: MemoFormats.HEX, data: hashesBuf.toString('hex').toUpperCase() },
                { type: MemoTypes.CANDIDATE_PROPOSE_REF, format: MemoFormats.HEX, data: memoBuf.toString('hex').toUpperCase() }
            ],
            options.transactionOptions);

        return uniqueId;
    }

    /**
     * Withdraw a hook candidate.
     * @param {string} candidateId Id of the candidate in hex format.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async _withdraw(candidateId, options = {}) {
        const candidateIdBuf = Buffer.from(candidateId, 'hex');
        return await this.xrplAcc.makePayment(this.governorAddress,
            XrplConstants.MIN_XRP_AMOUNT,
            XrplConstants.XRP,
            null,
            [
                { type: MemoTypes.CANDIDATE_WITHDRAW, format: MemoFormats.HEX, data: candidateIdBuf.toString('hex').toUpperCase() }
            ],
            options.transactionOptions);
    }

    /**
     * Report dud host for removal.
     * @param {*} hostAddress Address of the dud host.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async _reportDudHost(hostAddress, options = {}) {
        const candidateId = StateHelpers.getDudHostCandidateId(hostAddress);

        // Get the proposal fee. Proposal fee is 25% of current epochs moment worth of rewards.
        const proposalFee = (EvernodeHelpers.getEpochRewardQuota(this.config.rewardInfo.epoch, this.config.rewardConfiguration.firstEpochRewardQuota) / 4);

        return await this.xrplAcc.makePayment(this.governorAddress,
            proposalFee.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [
                { type: MemoTypes.DUD_HOST_REPORT, format: MemoFormats.HEX, data: candidateId }
            ],
            options.transactionOptions);
    }
}

module.exports = {
    BaseEvernodeClient
}

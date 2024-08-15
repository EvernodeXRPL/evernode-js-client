const codec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { XrplApi } = require('../xrpl-api');
const { XrplAccount } = require('../xrpl-account');
const { XrplApiEvents, XrplConstants, XrplTransactionTypes } = require('../xrpl-common');
const { EvernodeEvents, EventTypes, MemoFormats, EvernodeConstants, HookStateKeys, HookParamKeys, RegExp, ReputationConstants } = require('../evernode-common');
const { Defaults } = require('../defaults');
const { EncryptionHelper } = require('../encryption-helper');
const { EventEmitter } = require('../event-emitter');
const { UtilHelpers } = require('../util-helpers');
const { StateHelpers } = require('../state-helpers');
const { EvernodeHelpers } = require('../evernode-helpers');
const { HookHelpers } = require('../hook-helpers');
const xrpl = require('xrpl');

const CANDIDATE_PROPOSE_HASHES_PARAM_OFFSET = 0;
const CANDIDATE_PROPOSE_KEYLETS_PARAM_OFFSET = 128;
const CANDIDATE_PROPOSE_UNIQUE_ID_PARAM_OFFSET = 264;
const CANDIDATE_PROPOSE_SHORT_NAME_PARAM_OFFSET = 296;
const CANDIDATE_PROPOSE_PARAM_SIZE = 316;

const MAX_HOOK_PARAM_SIZE = 256;

const DUD_HOST_CANDID_ADDRESS_OFFSET = 12;

const REPUTATION_HOST_ADDRESS_PARAM_OFFSET = 0;
const REPUTATION_VALUE_PARAM_OFFSET = 20;

// HOST_DEREG
// By reputation address <host_address(20)><token_id(32)><error(1)>
const HOST_DEREG_FROM_REP_PARAM_SIZE = 53;

class BaseEvernodeClient {

    #watchEvents;
    #autoSubscribe;
    #ownsXrplApi = false;

    constructor(xrpAddress, xrpSecret, watchEvents, autoSubscribe = false, options = {}) {

        this.connected = false;
        this.governorAddress = options.governorAddress || Defaults.values.governorAddress;

        this.xrplApi = options.xrplApi || Defaults.values.xrplApi || new XrplApi(options.rippledServer);
        if (!options.xrplApi && !Defaults.values.xrplApi)
            this.#ownsXrplApi = true;

        if (options.config)
            this.config = options.config;

        this.xrplAcc = new XrplAccount(xrpAddress, xrpSecret, { xrplApi: this.xrplApi });
        this.accKeyPair = xrpSecret && this.xrplAcc.deriveKeypair();
        this.messagePrivateKey = options.messagePrivateKey || (this.accKeyPair ? this.accKeyPair.privateKey : null);
        if (this.messagePrivateKey && !RegExp.PublicPrivateKey.test(this.messagePrivateKey))
            throw "Message private key is not valid.";
        this.#watchEvents = watchEvents;
        this.#autoSubscribe = autoSubscribe;
        this.events = new EventEmitter();

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
    async connect(options = {}) {
        if (this.connected)
            return true;

        await this.xrplApi.connect();

        // Invoking the info command to check the account existence. This is important to 
        // identify a network reset from XRPL. 
        await this.xrplAcc.getInfo();

        if (!this.config && !options.skipConfigs)
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
     * @param {number} index [Optional] Index (timestamp) to get the moment start index.
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
        const configStateKeys = {
            registryAddress: HookStateKeys.REGISTRY_ADDR,
            heartbeatAddress: HookStateKeys.HEARTBEAT_ADDR,
            reputationAddress: HookStateKeys.REPUTATION_ADDR,
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
            governanceInfo: HookStateKeys.GOVERNANCE_INFO,
            transactionFeeBaseInfo: HookStateKeys.TRX_FEE_BASE_INFO,
            networkConfiguration: HookStateKeys.NETWORK_CONFIGURATION,
        }
        let config = {};
        for (const [key, value] of Object.entries(configStateKeys)) {
            const index = StateHelpers.getHookStateIndex(this.governorAddress, value);
            const ledgerEntry = await this.xrplApi.getLedgerEntry(index);
            const stateData = ledgerEntry?.HookStateData;
            if (stateData) {
                const stateDecoded = StateHelpers.decodeStateData(Buffer.from(value, 'hex'), Buffer.from(stateData, 'hex'));
                config[key] = stateDecoded.value;
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
            try {
                const ev = await this.extractEvernodeEvent(tx);
                if (ev && this.#watchEvents.find(e => e === ev.name))
                    this.events.emit(ev.name, ev.data);
            } catch (e) {
                console.log("Error occurred while handling Evernode events", e)
            }
        }
    }

    /**
     * Extracts the transaction info from a given transaction..
     * @param {object} tx Transaction to be deserialized and extracted.
     * @returns The event object in the format {name: '', data: {}}. Returns null if not handled. Note: You need to deserialize HookParameters before passing the transaction to this function.
     */
    async extractEvernodeEvent(tx) {
        let eventType;
        let eventData;
        if (tx.HookParameters.length) {
            eventType = tx.HookParameters.find(p => p.name === HookParamKeys.PARAM_EVENT_TYPE_KEY)?.value;
            eventData = tx.HookParameters.find(p => p.name === HookParamKeys.PARAM_EVENT_DATA_KEY)?.value ?? '';
        }
        if (tx.TransactionType === XrplTransactionTypes.URI_TOKEN_BUY_OFFER && eventType === EventTypes.ACQUIRE_LEASE && tx.Memos.length &&
            tx.Memos[0].type === EventTypes.ACQUIRE_LEASE && tx.Memos[0].format === MemoFormats.BASE64 && tx.Memos[0].data) {

            // If our account is the destination host account, then decrypt the payload if it is encrypted.
            let payload = tx.Memos[0].data;
            if (tx.Memos[0].format === MemoFormats.BASE64 && tx.Destination === this.xrplAcc.address) {
                const prefixBuf = (Buffer.from(payload, 'base64')).slice(0, 1);
                if (prefixBuf.readInt8() == 1) { // 1 denoted the data is encrypted
                    payload = Buffer.from(payload, 'base64').slice(1).toString('base64');
                    const decrypted = this.messagePrivateKey && await EncryptionHelper.decrypt(this.messagePrivateKey, payload);
                    if (decrypted)
                        payload = decrypted;
                    else
                        console.log('Failed to decrypt acquire data.');
                }
                else {
                    payload = JSON.parse(Buffer.from(payload, 'base64').slice(1).toString());
                }
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
        else if (eventType === EventTypes.ACQUIRE_SUCCESS && eventData && tx.Memos.length &&
            tx.Memos[0].type === EventTypes.ACQUIRE_SUCCESS && tx.Memos[0].data) {

            let payload = tx.Memos[0].data;
            const acquireRefId = eventData;

            // If our account is the destination user account, then decrypt the payload if it is encrypted.
            if (tx.Memos[0].format === MemoFormats.BASE64 && tx.Destination === this.xrplAcc.address) {
                const prefixBuf = (Buffer.from(payload, 'base64')).slice(0, 1);
                if (prefixBuf.readInt8() == 1) { // 1 denoted the data is encrypted
                    payload = Buffer.from(payload, 'base64').slice(1).toString('base64');
                    const decrypted = this.messagePrivateKey && await EncryptionHelper.decrypt(this.messagePrivateKey, payload);
                    if (decrypted)
                        payload = decrypted;
                    else
                        console.log('Failed to decrypt instance data.');
                }
                else {
                    payload = JSON.parse(Buffer.from(payload, 'base64').slice(1).toString());
                }
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
        else if (eventType === EventTypes.ACQUIRE_ERROR && eventData && tx.Memos.length &&
            tx.Memos[0].type === EventTypes.ACQUIRE_ERROR && tx.Memos[0].data) {

            let error = tx.Memos[0].data;
            const acquireRefId = eventData;

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
        else if (eventType === EventTypes.HOST_REG && eventData) {

            return {
                name: EvernodeEvents.HostRegistered,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (eventType === EventTypes.HOST_DEREG && eventData) {
            return {
                name: EvernodeEvents.HostDeregistered,
                data: {
                    transaction: tx,
                    host: eventData.length === HOST_DEREG_FROM_REP_PARAM_SIZE ? codec.encodeAccountID(Buffer.from(eventData, 'hex').slice(0, 20)) : tx.Account
                }
            }
        }
        else if (eventType === EventTypes.HEARTBEAT) {

            const voteInfo = (eventData && eventData.length) ?
                {
                    voteInfo: {
                        candidateId: eventData.substr(0, 64),
                        vote: Buffer.from(eventData, 'hex').slice(32, 33).readUInt8()
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
        else if (eventType === EventTypes.EXTEND_LEASE && eventData) {

            let uriTokenId = eventData;

            return {
                name: EvernodeEvents.ExtendLease,
                data: {
                    transaction: tx,
                    extendRefId: tx.hash,
                    tenant: tx.Account,
                    currency: tx.Amount.currency,
                    payment: (tx.Flags & xrpl.PaymentFlags.tfPartialPayment) ? parseFloat(tx.DeliveredAmount.value) : parseFloat(tx.Amount.value),
                    uriTokenId: uriTokenId
                }
            }
        }
        else if (eventType === EventTypes.TERMINATE_LEASE && eventData) {
            
            let uriTokenId = eventData;

            return {
                name: EvernodeEvents.TerminateLease,
                data: {
                    transaction: tx,
                    terminateRefId: tx.hash,
                    tenant: tx.Account,
                    uriTokenId: uriTokenId
                }
            }
        }
        else if (eventType === EventTypes.EXTEND_SUCCESS && eventData && tx.Memos.length &&
            tx.Memos[0].type === EventTypes.EXTEND_SUCCESS && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            const extendResBuf = Buffer.from(tx.Memos[0].data, 'hex');
            const extendRefId = eventData;

            return {
                name: EvernodeEvents.ExtendSuccess,
                data: {
                    transaction: tx,
                    extendRefId: extendRefId,
                    expiryMoment: extendResBuf.readUInt32BE()
                }
            }

        }
        else if (eventType === EventTypes.EXTEND_ERROR && eventData && tx.Memos.length &&
            tx.Memos[0].type === EventTypes.EXTEND_ERROR && tx.Memos[0].data) {

            let error = tx.Memos[0].data;
            const extendRefId = eventData;

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
        else if (eventType === EventTypes.INIT && eventData) {

            return {
                name: EvernodeEvents.Initialized,
                data: {
                    transaction: tx
                }
            }
        }
        else if (eventType === EventTypes.HOST_UPDATE_INFO && eventData) {

            return {
                name: EvernodeEvents.HostRegUpdated,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (eventType === EventTypes.DEAD_HOST_PRUNE && eventData) {

            const addrsBuf = Buffer.from(eventData, 'hex');

            return {
                name: EvernodeEvents.DeadHostPrune,
                data: {
                    transaction: tx,
                    host: codec.encodeAccountID(addrsBuf)
                }
            }
        }
        else if (eventType === EventTypes.HOST_REBATE) {

            return {
                name: EvernodeEvents.HostRebate,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (eventType === EventTypes.HOST_TRANSFER && eventData) {

            const addrsBuf = Buffer.from(eventData, 'hex');

            return {
                name: EvernodeEvents.HostTransfer,
                data: {
                    transaction: tx,
                    transferee: codec.encodeAccountID(addrsBuf)
                }
            }
        }
        else if (eventType === EventTypes.CANDIDATE_PROPOSE && eventData) {

            return {
                name: EvernodeEvents.CandidateProposed,
                data: {
                    transaction: tx,
                    owner: tx.Account,
                    candidateId: eventData.substr(CANDIDATE_PROPOSE_UNIQUE_ID_PARAM_OFFSET * 2, 64)
                }
            }
        }
        else if (eventType === EventTypes.CANDIDATE_WITHDRAW && eventData) {
            return {
                name: EvernodeEvents.CandidateWithdrawn,
                data: {
                    transaction: tx,
                    owner: tx.Account,
                    candidateId: eventData.substr(0, 64)
                }
            }
        }
        else if (eventType === EventTypes.CANDIDATE_STATUS_CHANGE && eventData) {
            const eventDataBuf = Buffer.from(eventData, 'hex');
            const candidateId = eventDataBuf.slice(0, 32).toString('hex');
            const candidateType = StateHelpers.getCandidateType(candidateId);

            switch (candidateType) {
                case (EvernodeConstants.CandidateTypes.DudHost):
                    return {
                        name: eventDataBuf.readUInt8(32) === EvernodeConstants.CandidateStatuses.CANDIDATE_ELECTED ? EvernodeEvents.DudHostRemoved : EvernodeEvents.DudHostStatusChanged,
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
        else if (eventType === EventTypes.LINKED_CANDIDATE_REMOVE && eventData) {
            const eventDataBuf = Buffer.from(eventData, 'hex');
            const candidateId = eventDataBuf.slice(0, 32).toString('hex');
            const candidateType = StateHelpers.getCandidateType(candidateId);

            if (candidateType === EvernodeConstants.CandidateTypes.DudHost) {
                return {
                    name: EvernodeEvents.LinkedDudHostCandidateRemoved,
                    data: {
                        transaction: tx,
                        candidateId: candidateId,
                        host: codec.encodeAccountID(Buffer.from(candidateId, 'hex').slice(DUD_HOST_CANDID_ADDRESS_OFFSET, 32))
                    }
                }
            }
        }
        else if (eventType === EventTypes.HOOK_UPDATE_RES && eventData) {
            return {
                name: EvernodeEvents.ChildHookUpdated,
                data: {
                    transaction: tx,
                    account: tx.Account,
                    candidateId: eventData.substr(0, 64)
                }
            }
        }
        else if (eventType === EventTypes.GOVERNANCE_MODE_CHANGE && eventData) {
            const mode = Buffer.from(eventData, 'hex').slice(0, 1).readUInt8();

            return {
                name: EvernodeEvents.GovernanceModeChanged,
                data: {
                    transaction: tx,
                    mode: mode
                }
            }
        }
        else if (eventType === EventTypes.CANDIDATE_VOTE && eventData) {
            const vote = Buffer.from(eventData, 'hex').slice(32, 33).readUInt8();

            return {
                name: EvernodeEvents.FoundationVoted,
                data: {
                    transaction: tx,
                    candidateId: eventData.substr(0, 64),
                    vote: vote
                }
            }
        }
        else if (eventType === EventTypes.DUD_HOST_REPORT && eventData) {
            const candidateId = eventData.substr(0, 64);

            return {
                name: EvernodeEvents.DudHostReported,
                data: {
                    transaction: tx,
                    candidateId: candidateId,
                    host: codec.encodeAccountID(Buffer.from(candidateId, 'hex').slice(DUD_HOST_CANDID_ADDRESS_OFFSET, 32))
                }
            }
        }
        else if (eventType === EventTypes.HOST_UPDATE_REPUTATION && eventData) {
            const dataBuf = Buffer.from(eventData, 'hex');

            return {
                name: EvernodeEvents.HostReputationUpdated,
                data: {
                    transaction: tx,
                    host: codec.encodeAccountID(dataBuf.slice(REPUTATION_HOST_ADDRESS_PARAM_OFFSET, 20)),
                    reputation: dataBuf.readUInt8(REPUTATION_VALUE_PARAM_OFFSET)
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

                const hostAcc = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
                addrStateDecoded.domain = await hostAcc.getDomain();

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
     * Get the hosts registered in Evernode.
     * @returns The list of hosts. 
     */
    async getAllHostsFromLedger(getDomain = true) {
        const states = await this.getHookStates();
        let hosts = {};

        for (const state of states) {
            const stateKey = Buffer.from(state.key, 'hex');
            if (state.data) {
                const stateData = Buffer.from(state.data, 'hex');
                const decoded = StateHelpers.decodeStateData(stateKey, stateData);
                if (decoded.type == StateHelpers.StateTypes.HOST_ADDR || decoded.type == StateHelpers.StateTypes.TOKEN_ID) {
                    hosts[decoded.address] = { ...(hosts[decoded.address] ?? {}), ...decoded };
                }
            }
        }

        const hostList = Object.values(hosts);

        const curMomentStartIdx = await this.getMomentStartIndex();
        await Promise.all((hostList).map(async host => {
            const hostAcc = new XrplAccount(host.address, null, { xrplApi: this.xrplApi });
            if (getDomain) {
                host.domain = await hostAcc.getDomain();
            }
            host.active = (host.lastHeartbeatIndex > (this.config.hostHeartbeatFreq * this.config.momentSize) ?
                (host.lastHeartbeatIndex >= (curMomentStartIdx - (this.config.hostHeartbeatFreq * this.config.momentSize))) :
                (host.lastHeartbeatIndex > 0));
            return host;
        }));

        return hostList;
    }

    /**
     * Get the governor in Evernode.
     * @returns The list of candidates. 
     */
    async getAllCandidatesFromLedger() {
        const states = await this.getHookStates();
        let candidates = [];

        for (const state of states) {
            const stateKey = Buffer.from(state.key, 'hex');
            if (state.data) {
                const stateData = Buffer.from(state.data, 'hex');
                const decoded = StateHelpers.decodeStateData(stateKey, stateData);
                if (decoded.type == StateHelpers.StateTypes.CANDIDATE_ID) {
                    candidates.push(decoded);
                }
            }
        }

        return candidates;
    }

    /**
     * Remove a host which is inactive for a long period. The inactivity is checked by Evernode it self and only pruned if inactive thresholds are met.
     * @param {string} hostAddress XRPL address of the host to be pruned.
     */
    async pruneDeadHost(hostAddress) {
        if (this.xrplAcc.address === this.config.registryAddress)
            throw 'Invalid function call';

        let paramData = Buffer.alloc(20, 0);
        codec.decodeAccountID(hostAddress).copy(paramData);

        const hostInfo = await this.getHostInfo(hostAddress);

        let validPrune = false;
        // If this host is a transferer, it does not own a registration token
        if (!hostInfo.isATransferer) {
            const hostAcc = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
            const regUriToken = (await hostAcc.getURITokens()).find(n => n.URI.startsWith(EvernodeConstants.TOKEN_PREFIX_HEX) && n.Issuer === this.config.registryAddress);
            validPrune = !!regUriToken;
        }
        else
            validPrune = true;


        if (validPrune) {
            await this.xrplAcc.makePayment(this.config.registryAddress,
                XrplConstants.MIN_DROPS,
                null,
                null,
                null,
                {
                    hookParams: [
                        { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.DEAD_HOST_PRUNE },
                        { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: paramData.toString('hex') }
                    ]
                });
        } else
            throw "No Registration URI token was found for the Host account."

    }

    /**
     * Get proposed new hook candidate info.
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
     * Get proposed dud host candidates.
     * @param {string} ownerAddress | Address of the owner
     * @returns An array of candidate information. Returns empty array if no candidates.
     */
    async getDudHostCandidatesByOwner(ownerAddress = this.xrplAcc.address) {
        try {
            const candidates = await this.getAllCandidatesFromLedger();
            let filteredCandidates = candidates.filter(c => c.ownerAddress === ownerAddress);
            if (filteredCandidates && filteredCandidates.length > 0) {
                filteredCandidates = filteredCandidates.filter(c => StateHelpers.getCandidateType(c.uniqueId) == EvernodeConstants.CandidateTypes.DudHost);
                return filteredCandidates;
            }
        } catch (error) {
            console.log(error)
        }
        return [];
    }

    /**
     * Get candidate info.
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
                let idStateDecoded = StateHelpers.decodeCandidateIdState(Buffer.from(idStateData, 'hex'));
                const candidateType = StateHelpers.getCandidateType(candidateId);
                if (candidateType === EvernodeConstants.CandidateTypes.NewHook) {
                    const ownerStateKey = StateHelpers.generateCandidateOwnerStateKey(idStateDecoded.ownerAddress);
                    const ownerStateIndex = StateHelpers.getHookStateIndex(this.governorAddress, ownerStateKey);
                    const ownerLedgerEntry = await this.xrplApi.getLedgerEntry(ownerStateIndex);

                    const ownerStateData = ownerLedgerEntry?.HookStateData;
                    if (ownerStateData) {
                        const ownerStateDecoded = StateHelpers.decodeCandidateOwnerState(Buffer.from(ownerStateKey, 'hex'), Buffer.from(ownerStateData, 'hex'));
                        return { ...ownerStateDecoded, ...idStateDecoded };
                    }
                }
                else if (candidateType === EvernodeConstants.CandidateTypes.DudHost) {
                    idStateDecoded.dudHostAddress = codec.encodeAccountID(Buffer.from(idStateKey, 'hex').slice(12, 32));
                }

                return { ...idStateDecoded, uniqueId: candidateId };
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
     * Get reputation order info of given orderedId.
     * @param {number} orderedId Order id of the host.
     * @param {number} moment (optional) Moment to get reputation info for.
     * @returns Reputation address info object.
     */
    async getReputationAddressByOrderedId(orderedId, moment = null) {
        try {
            const repMoment = moment ?? await this.getMoment();
            const orderedIdStateKey = StateHelpers.generateReputationHostOrderedIdStateKey(orderedId, repMoment);
            const orderedIdStateIndex = StateHelpers.getHookStateIndex(this.xrplAcc.address, orderedIdStateKey);
            const orderedIdLedgerEntry = await this.xrplApi.getLedgerEntry(orderedIdStateIndex);
            const orderedIdStateData = orderedIdLedgerEntry?.HookStateData;

            if (orderedIdStateData) {
                const orderedIdStateDecoded = StateHelpers.decodeReputationHostOrderedIdState(Buffer.from(orderedIdStateKey, 'hex'), Buffer.from(orderedIdStateData, 'hex'));
                return orderedIdStateDecoded;
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
     * Get reputation order info of given host.
     * @param {string} hostAddress (optional) Host address.
     * @param {number} moment (optional) Moment to get reputation info for.
     * @returns Reputation order info object.
     */
    async getReputationOrderByAddress(hostAddress = this.xrplAcc.address, moment = null) {
        try {
            const repMoment = moment ?? await this.getMoment();
            const orderedAddrStateKey = StateHelpers.generateReputationHostOrderAddressStateKey(hostAddress, repMoment);
            const orderedAddrStateIndex = StateHelpers.getHookStateIndex(this.config.reputationAddress, orderedAddrStateKey);
            const orderedAddrLedgerEntry = await this.xrplApi.getLedgerEntry(orderedAddrStateIndex);
            const orderedAddrStateData = orderedAddrLedgerEntry?.HookStateData;

            if (orderedAddrStateData) {
                const orderedAddrStateDecoded = StateHelpers.decodeReputationHostOrderAddressState(Buffer.from(orderedAddrStateKey, 'hex'), Buffer.from(orderedAddrStateData, 'hex'));
                return orderedAddrStateDecoded;
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
     * Get reputation contract info of given host.
     * @param {string} hostsAddress Host address.
     * @param {number} moment (optional) Moment to get reputation contract info for.
     * @returns Reputation contract info object.
     */
    async getReputationContractInfoByAddress(hostAddress = this.xrplAcc.address, moment = null) {
        try {
            const hostAcc = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
            const [hostWl, domain] = await Promise.all([hostAcc.getWalletLocator(), hostAcc.getDomain()]);

            if (hostWl) {
                const hostWlBuf = Buffer.from(hostWl, 'hex');
                const reputationAddress = codec.encodeAccountID(hostWlBuf.slice(1, 21));
                const reputationAcc = new XrplAccount(reputationAddress, null, { xrplApi: this.xrplApi });
                const repMoment = moment ?? await this.getMoment();

                let repBuf = null;
                // 1 - 1 Reputation account.
                if (hostWlBuf.readUInt8() === EvernodeConstants.ReputationAccountMode.OneToOne) {
                    const rep = await reputationAcc.getDomain();
                    if (rep)
                        repBuf = Buffer.from(rep, 'hex');
                }
                // 1 - M Reputation account
                else if (hostWlBuf.readUInt8() === EvernodeConstants.ReputationAccountMode.OneToMany) {
                    const stateKey = StateHelpers.generateReputationContractInfoStateKey(hostAddress);
                    const stateIndex = StateHelpers.getHookStateIndex(reputationAddress, stateKey, EvernodeConstants.HOST_REPUTATION_HOOK_NAMESPACE);
                    const ledgerEntry = await this.xrplApi.getLedgerEntry(stateIndex);
                    const stateData = ledgerEntry?.HookStateData;
                    if (stateData)
                        repBuf = Buffer.from(stateData, 'hex');
                }

                if (repBuf) {
                    const instanceMoment = (repBuf.length > ReputationConstants.REP_INFO_MOMENT_OFFSET) ? Number(repBuf.readBigUInt64LE(ReputationConstants.REP_INFO_MOMENT_OFFSET)) : null;
                    if (instanceMoment === repMoment) {
                        return {
                            domain: domain,
                            pubkey: repBuf.slice(0, ReputationConstants.REP_INFO_PEER_PORT_OFFSET).toString('hex').toLocaleLowerCase(),
                            peerPort: repBuf.readUInt16LE(ReputationConstants.REP_INFO_PEER_PORT_OFFSET)
                        }
                    }
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
     * Get reputation info of given host.
     * @param {string} hostsAddress Host address.
     * @returns Reputation info object.
     */
    async getReputationInfoByAddress(hostAddress = this.xrplAcc.address) {
        try {
            const addrStateKey = StateHelpers.generateReputationHostAddrStateKey(hostAddress);
            const addrStateIndex = StateHelpers.getHookStateIndex(this.config.reputationAddress, addrStateKey);
            const addrLedgerEntry = await this.xrplApi.getLedgerEntry(addrStateIndex);
            const addrStateData = addrLedgerEntry?.HookStateData;

            if (addrStateData) {
                let addrStateDecoded = StateHelpers.decodeReputationHostAddressState(Buffer.from(addrStateKey, 'hex'), Buffer.from(addrStateData, 'hex'));
                const curMoment = await this.getMoment();
                addrStateDecoded.valid = !!(addrStateDecoded.lastScoredMoment && (curMoment - addrStateDecoded.lastScoredMoment) <= ReputationConstants.SCORE_EXPIRY_MOMENT_COUNT);
                return addrStateDecoded;
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
     * Propose a new hook candidate.
     * @param {string} hashes Hook candidate hashes in hex format, <GOVERNOR_HASH(32)><REGISTRY_HASH(32)><HEARTBEAT_HASH(32)>.
     * @param {string} shortName Short name for the proposal candidate.
     * @param {*} options [Optional] transaction options.
     * @returns Proposed candidate id.
     */
    async _propose(hashes, shortName, options = {}) {
        const hashesBuf = Buffer.from(hashes, 'hex');
        if (!hashesBuf || hashesBuf.length != 128)
            throw 'Invalid hashes: Hashes should contain all three Governor, Registry, Heartbeat, Reputation hook hashes.';

        // Check whether hook hashes exist in the definition.
        let keylets = [];
        for (const [i, hook] of EvernodeConstants.HOOKS.entries()) {
            const index = HookHelpers.getHookDefinitionIndex(hashes.substr(i * 64, 64));
            const ledgerEntry = await this.xrplApi.getLedgerEntry(index);
            if (!ledgerEntry)
                throw `No hook exists with the specified ${hook} hook hash.`;
            else
                keylets.push(HookHelpers.getKeylet('HOOK_DEFINITION', index));
        }

        const uniqueId = StateHelpers.getNewHookCandidateId(hashesBuf);
        const paramBuf = Buffer.alloc(CANDIDATE_PROPOSE_PARAM_SIZE);
        hashesBuf.copy(paramBuf, CANDIDATE_PROPOSE_HASHES_PARAM_OFFSET);
        Buffer.from(keylets.join(''), 'hex').copy(paramBuf, CANDIDATE_PROPOSE_KEYLETS_PARAM_OFFSET);
        Buffer.from(uniqueId, 'hex').copy(paramBuf, CANDIDATE_PROPOSE_UNIQUE_ID_PARAM_OFFSET);
        Buffer.from(shortName.substr(0, 20), "utf-8").copy(paramBuf, CANDIDATE_PROPOSE_SHORT_NAME_PARAM_OFFSET);

        // Get the proposal fee. Proposal fee is current epochs moment worth of rewards.
        const proposalFee = EvernodeHelpers.getEpochRewardQuota(this.config.rewardInfo.epoch, this.config.rewardConfiguration.firstEpochRewardQuota);

        await this.xrplAcc.makePayment(this.governorAddress,
            proposalFee.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            null,
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.CANDIDATE_PROPOSE },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: paramBuf.slice(0, MAX_HOOK_PARAM_SIZE).toString('hex').toUpperCase() },
                    { name: HookParamKeys.PARAM_EVENT_DATA2_KEY, value: paramBuf.slice(MAX_HOOK_PARAM_SIZE).toString('hex').toUpperCase() }

                ],
                ...options.transactionOptions
            });

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
            XrplConstants.MIN_DROPS,
            null,
            null,
            null,
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.CANDIDATE_WITHDRAW },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: candidateIdBuf.toString('hex').toUpperCase() }
                ],
                ...options.transactionOptions
            });
    }

    /**
     * Report dud host for removal.
     * @param {string} hostAddress Address of the dud host.
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
            null,
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.DUD_HOST_REPORT },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: candidateId }
                ],
                ...options.transactionOptions
            });
    }
}

module.exports = {
    BaseEvernodeClient
}

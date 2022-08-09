const { Buffer } = require('buffer');
const { XrplApi } = require('../xrpl-api');
const { XrplAccount } = require('../xrpl-account');
const { XrplApiEvents } = require('../xrpl-common');
const { EvernodeEvents, MemoTypes, MemoFormats, EvernodeConstants, HookStateKeys } = require('../evernode-common');
const { DefaultValues } = require('../defaults');
const { EncryptionHelper } = require('../encryption-helper');
const { EventEmitter } = require('../event-emitter');
const { UtilHelpers } = require('../util-helpers');
const { FirestoreHandler } = require('../firestore/firestore-handler');
const { StateHelpers } = require('../state-helpers');

class BaseEvernodeClient {

    #watchEvents;
    #autoSubscribe;
    #ownsXrplApi = false;
    #firestoreHandler;

    constructor(xrpAddress, xrpSecret, watchEvents, autoSubscribe = false, options = {}) {

        this.connected = false;
        this.registryAddress = options.registryAddress || DefaultValues.registryAddress;

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
        this.xrplAcc.on(XrplApiEvents.NFT_OFFER_CREATE, (tx, error) => this.#handleEvernodeEvent(tx, error));
        this.xrplAcc.on(XrplApiEvents.NFT_OFFER_ACCEPT, (tx, error) => this.#handleEvernodeEvent(tx, error));

    }

    on(event, handler) {
        this.events.on(event, handler);
    }

    once(event, handler) {
        this.events.once(event, handler);
    }

    off(event, handler = null) {
        this.events.off(event, handler);
    }

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

    async disconnect() {
        await this.unsubscribe();

        if (this.#ownsXrplApi)
            await this.xrplApi.disconnect();
    }

    async subscribe() {
        await this.xrplAcc.subscribe();
    }

    async unsubscribe() {
        await this.xrplAcc.unsubscribe();
    }

    async getEVRBalance() {
        const lines = await this.xrplAcc.getTrustLines(EvernodeConstants.EVR, this.config.evrIssuerAddress);
        if (lines.length > 0)
            return lines[0].balance;
        else
            return '0';
    }

    async getHookStates() {
        const regAcc = new XrplAccount(this.registryAddress, null, { xrplApi: this.xrplApi });
        const configs = await regAcc.getNamespaceEntries(EvernodeConstants.HOOK_NAMESPACE);

        if (configs)
            return configs.filter(c => c.LedgerEntryType === 'HookState').map(c => { return { key: c.HookStateKey, data: c.HookStateData } });
        return [];
    }

    async getMoment(ledgerIndex = null) {
        const lv = ledgerIndex || this.xrplApi.ledgerIndex;
        const m = Math.floor((lv - this.config.momentBaseIdx) / this.config.momentSize);

        await Promise.resolve(); // Awaiter placeholder for future async requirements.
        return m;
    }

    async getMomentStartIndex(ledgerIndex = null) {
        const lv = ledgerIndex || this.xrplApi.ledgerIndex;
        const m = Math.floor((lv - this.config.momentBaseIdx) / this.config.momentSize);

        await Promise.resolve(); // Awaiter placeholder for future async requirements.
        return this.config.momentBaseIdx + (m * this.config.momentSize);
    }

    async #getEvernodeConfig() {
        let states = await this.getHookStates();
        const configStateKeys = {
            evrIssuerAddress: HookStateKeys.EVR_ISSUER_ADDR,
            foundationAddress: HookStateKeys.FOUNDATION_ADDR,
            hostRegFee: HookStateKeys.HOST_REG_FEE,
            momentSize: HookStateKeys.MOMENT_SIZE,
            hostHeartbeatFreq: HookStateKeys.HOST_HEARTBEAT_FREQ,
            momentBaseIdx: HookStateKeys.MOMENT_BASE_IDX,
            purchaserTargetPrice: HookStateKeys.PURCHASER_TARGET_PRICE,
            leaseAcquireWindow: HookStateKeys.LEASE_ACQUIRE_WINDOW,
            rewardInfo: HookStateKeys.REWARD_INFO,
            rewardConfiguaration: HookStateKeys.REWARD_CONFIGURATION,
            hostCount: HookStateKeys.HOST_COUNT
        }
        let config = {};
        for (const [key, value] of Object.entries(configStateKeys)) {
            const stateKey = Buffer.from(value, 'hex');
            const stateData = Buffer.from(UtilHelpers.getStateData(states, value), 'hex');
            const decoded = StateHelpers.decodeStateData(stateKey, stateData);
            config[key] = decoded.value;
        }
        return config;
    }

    async refreshConfig() {
        this.config = await this.#getEvernodeConfig();
    }

    async #handleEvernodeEvent(tx, error) {
        if (error)
            console.error(error);
        else if (!tx)
            console.log('handleEvernodeEvent: Invalid transaction.');
        else {
            const ev = await this.#extractEvernodeEvent(tx);
            if (ev && this.#watchEvents.find(e => e === ev.name))
                this.events.emit(ev.name, ev.data);
        }
    }

    async #extractEvernodeEvent(tx) {
        if (tx.TransactionType === 'NFTokenAcceptOffer' && tx.NFTokenSellOffer && tx.Memos.length >= 1 &&
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
                    nfTokenId: tx.NFTokenSellOffer.NFTokenID,
                    leaseAmount: tx.NFTokenSellOffer.Amount.value,
                    acquireRefId: tx.hash,
                    tenant: tx.Account,
                    payload: payload
                }
            }
        }

        else if (tx.TransactionType === 'NFTokenAcceptOffer' && tx.NFTokenBuyOffer && tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.HOST_POST_DEREG && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {
            return {
                name: EvernodeEvents.HostPostDeregistered,
                data: {
                    transaction: tx,
                    nfTokenId: tx.NFTokenBuyOffer.NFTokenID,
                    flags: tx.Flags,
                    hash: tx.hash
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
            tx.Memos[0].type === MemoTypes.HOST_REG && tx.Memos[0].format === MemoFormats.TEXT && tx.Memos[0].data) {

            const parts = tx.Memos[0].data.split(';');
            return {
                name: EvernodeEvents.HostRegistered,
                data: {
                    transaction: tx,
                    host: tx.Account,
                    token: parts[0],
                    instanceSize: parts[1],
                    location: parts[2]
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

            return {
                name: EvernodeEvents.Heartbeat,
                data: {
                    transaction: tx,
                    host: tx.Account
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.EXTEND_LEASE && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            let nfTokenId = tx.Memos[0].data;

            return {
                name: EvernodeEvents.ExtendLease,
                data: {
                    transaction: tx,
                    extendRefId: tx.hash,
                    tenant: tx.Account,
                    currency: tx.Amount.currency,
                    payment: parseFloat(tx.Amount.value),
                    nfTokenId: nfTokenId
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
            tx.Memos[0].type === MemoTypes.REGISTRY_INIT && tx.Memos[0].format === MemoFormats.HEX && tx.Memos[0].data) {

            return {
                name: EvernodeEvents.RegistryInitialized,
                data: {
                    transaction: tx
                }
            }
        }
        else if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.HOST_UPDATE_INFO && tx.Memos[0].format === MemoFormats.TEXT && tx.Memos[0].data) {

            const specs = tx.Memos[0].data.split(';');

            return {
                name: EvernodeEvents.HostRegUpdated,
                data: {
                    transaction: tx,
                    host: tx.Account,
                    version: specs[specs.length - 1],
                    specs: specs,
                }
            }
        }

        return null;
    }

    // To get Host details from Hook States.
    async getHostInfo(hostAddress = this.xrplAcc.address) {
        try {
            const addrStateKey = StateHelpers.generateHostAddrStateKey(hostAddress);
            const addrStateIndex = StateHelpers.getHookStateIndex(this.registryAddress, addrStateKey);
            const addrLedgerEntry = await this.xrplApi.getLedgerEntry(addrStateIndex);
            const addrStateData = addrLedgerEntry?.HookStateData;
            if (addrStateData) {
                const addrStateDecoded = StateHelpers.decodeHostAddressState(Buffer.from(addrStateKey, 'hex'), Buffer.from(addrStateData, 'hex'));
                const curMomentStartIdx = await this.getMomentStartIndex();
                addrStateDecoded.active = (addrStateDecoded.lastHeartbeatLedger > (this.config.hostHeartbeatFreq * this.config.momentSize) ?
                    (addrStateDecoded.lastHeartbeatLedger >= (curMomentStartIdx - (this.config.hostHeartbeatFreq * this.config.momentSize))) :
                    (addrStateDecoded.lastHeartbeatLedger > 0))

                const nftIdStatekey = StateHelpers.generateTokenIdStateKey(addrStateDecoded.nfTokenId);
                const nftIdStateIndex = StateHelpers.getHookStateIndex(this.registryAddress, nftIdStatekey);
                const nftIdLedgerEntry = await this.xrplApi.getLedgerEntry(nftIdStateIndex);
                
                const nftIdStateData = nftIdLedgerEntry?.HookStateData;
                if (nftIdStateData) {
                    const nftIdStateDecoded = StateHelpers.decodeTokenIdState(Buffer.from(nftIdStateData, 'hex'));
                    return {...addrStateDecoded, ...nftIdStateDecoded};
                }
            }
        }
        catch (e) {
            // If the exeption is entryNotFound from Rippled there's no entry for the host, So return null.
            if (e?.data?.error !== 'entryNotFound')
                throw e;
        }

        return null;
    }

    // To fetch records from host collection in Firestore database. (Pagination is applied - default page size :20)
    async getHosts(filters = null, pageSize = null, nextPageToken = null) {
        const hosts = await this.#firestoreHandler.getHosts(filters, pageSize, nextPageToken);
        const curMomentStartIdx = await this.getMomentStartIndex();
        // Populate the host active status.
        (hosts.nextPageToken ? hosts.data : hosts).forEach(h => {
            h.active = (h.lastHeartbeatLedger > (this.config.hostHeartbeatFreq * this.config.momentSize) ?
                (h.lastHeartbeatLedger >= (curMomentStartIdx - (this.config.hostHeartbeatFreq * this.config.momentSize))) :
                (h.lastHeartbeatLedger > 0))
        });
        return hosts;
    }

    // To fetch all records from config collection in Firestore database.
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

    // To fetch all records from host collection in Firestore database.
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
}

module.exports = {
    BaseEvernodeClient
}
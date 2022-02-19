const { XrplApi } = require('../xrpl-api');
const { XrplAccount } = require('../xrpl-account');
const { XrplApiEvents } = require('../xrpl-common');
const { EvernodeEvents, HookStateKeys, MemoTypes, MemoFormats, EvernodeConstants } = require('../evernode-common');
const { DefaultValues } = require('../defaults');
const { EncryptionHelper } = require('../encryption-helper');
const { EventEmitter } = require('../event-emitter');
const { XflHelpers } = require('../xfl-helpers');
const codec = require('ripple-address-codec');
const { Buffer } = require('buffer');
const { UtilHelpers } = require('../util-helpers');

class BaseEvernodeClient {

    #watchEvents;
    #autoSubscribe;
    #ownsXrplApi = false;

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

        this.xrplAcc.on(XrplApiEvents.PAYMENT, (tx, error) => this.#handleEvernodeEvent(tx, error));
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
            return;

        await this.xrplApi.connect();

        this.config = await this.#getEvernodeConfig();
        this.connected = true;

        if (this.#autoSubscribe)
            await this.subscribe();
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

    async getStates(options = { limit: 399 }) {
        // We use a large limit since there's no way to just get the HookState objects.
        const states = await this.xrplApi.getAccountObjects(this.registryAddress, options);
        return states.filter(s => s.LedgerEntryType === 'HookState').map(s => {
            return {
                key: s.HookStateKey, //hex
                data: s.HookStateData //hex
            }
        });
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
        let states = await this.getStates();
        states = states.map(s => {
            return {
                key: s.key,
                data: Buffer.from(s.data, 'hex')
            }
        });

        let config = {};
        let buf = null;

        buf = UtilHelpers.getStateData(states, HookStateKeys.EVR_ISSUER_ADDR);
        config.evrIssuerAddress = codec.encodeAccountID(buf);

        buf = UtilHelpers.getStateData(states, HookStateKeys.FOUNDATION_ADDR);
        config.foundationAddress = codec.encodeAccountID(buf);

        buf = UtilHelpers.getStateData(states, HookStateKeys.HOST_REG_FEE);
        const xfl = buf.readBigInt64BE(0);
        config.hostRegFee = XflHelpers.toString(xfl);

        buf = UtilHelpers.getStateData(states, HookStateKeys.MOMENT_SIZE);
        config.momentSize = UtilHelpers.readUInt(buf, 16);

        buf = UtilHelpers.getStateData(states, HookStateKeys.REDEEM_WINDOW);
        config.redeemWindow = UtilHelpers.readUInt(buf, 16);

        buf = UtilHelpers.getStateData(states, HookStateKeys.HOST_HEARTBEAT_FREQ);
        config.hostHeartbeatFreq = UtilHelpers.readUInt(buf, 16);

        buf = UtilHelpers.getStateData(states, HookStateKeys.MOMENT_BASE_IDX);
        config.momentBaseIdx = UtilHelpers.readUInt(buf, 64);

        return config;
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
        if (!tx.Memos || tx.Memos.length === 0)
            return null;

        if (tx.Memos.length >= 1 &&
            tx.Memos[0].type === MemoTypes.REDEEM && tx.Memos[0].format === MemoFormats.BASE64 && tx.Memos[0].data) {

            // If our account is the destination host account, then decrypt the payload.
            let payload = tx.Memos[0].data;
            if (tx.Destination === this.xrplAcc.address) {
                const decrypted = this.accKeyPair && await EncryptionHelper.decrypt(this.accKeyPair.privateKey, payload);
                if (decrypted)
                    payload = decrypted;
                else
                    console.log('Failed to decrypt redeem data.');
            }

            if (tx.Memos.length >= 2 &&
                tx.Memos[1].type === MemoTypes.REDEEM_ORIGIN && tx.Memos[1].format === MemoFormats.HEX && tx.Memos[1].data) {

                // If the origin memo exists, get the token and user information from it.
                const buf = Buffer.from(tx.Memos[1].data, 'hex');

                return {
                    name: EvernodeEvents.Redeem,
                    data: {
                        transaction: tx,
                        redeemRefId: buf.slice(31, 63).toString('hex'),
                        user: codec.encodeAccountID(buf.slice(0, 20)),
                        host: tx.Destination,
                        token: buf.slice(28, 31).toString(),
                        moments: parseInt(buf.slice(20, 28).readBigInt64BE(0)),
                        payload: payload
                    }
                }
            }
            else {
                return {
                    name: EvernodeEvents.Redeem,
                    data: {
                        transaction: tx,
                        redeemRefId: tx.Hash,
                        user: tx.Account,
                        host: tx.Amount.issuer,
                        token: tx.Amount.currency,
                        moments: parseInt(tx.Amount.value),
                        payload: payload
                    }
                }
            }
        }
        else if (tx.Memos.length >= 2 &&
            tx.Memos[0].type === MemoTypes.REDEEM_SUCCESS && tx.Memos[0].data &&
            tx.Memos[1].type === MemoTypes.REDEEM_REF && tx.Memos[1].data) {

            let payload = tx.Memos[0].data;
            const redeemRefId = tx.Memos[1].data;

            // If our account is the destination user account, then decrypt the payload.
            if (tx.Memos[0].format === MemoFormats.BASE64 && tx.Destination === this.xrplAcc.address) {
                const decrypted = this.accKeyPair && await EncryptionHelper.decrypt(this.accKeyPair.privateKey, payload);
                if (decrypted)
                    payload = decrypted;
                else
                    console.log('Failed to decrypt instance data.');
            }

            return {
                name: EvernodeEvents.RedeemSuccess,
                data: {
                    transaction: tx,
                    redeemRefId: redeemRefId,
                    payload: payload
                }
            }

        }
        else if (tx.Memos.length >= 2 &&
            tx.Memos[0].type === MemoTypes.REDEEM_ERROR && tx.Memos[0].data &&
            tx.Memos[1].type === MemoTypes.REDEEM_REF && tx.Memos[1].data) {

            let error = tx.Memos[0].data;
            const redeemRefId = tx.Memos[1].data;

            if (tx.Memos[0].format === MemoFormats.JSON)
                error = JSON.parse(error).reason;

            return {
                name: EvernodeEvents.RedeemError,
                data: {
                    transaction: tx,
                    redeemRefId: redeemRefId,
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
            tx.Memos[0].type === MemoTypes.RECHARGE) {

            return {
                name: EvernodeEvents.Recharge,
                data: {
                    transaction: tx,
                    host: tx.Account,
                    amount: tx.Amount.value,
                    issuer: tx.Amount.issuer,
                    currency: tx.Amount.currency
                }
            }
        }

        return null;
    }
}

module.exports = {
    BaseEvernodeClient
}
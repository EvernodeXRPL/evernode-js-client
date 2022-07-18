const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, MemoFormats, MemoTypes, ErrorCodes, ErrorReasons, EvernodeConstants } = require('../evernode-common');
const { EventEmitter } = require('../event-emitter');
const { EncryptionHelper } = require('../encryption-helper');
const { XrplAccount } = require('../xrpl-account');
const { UtilHelpers } = require('../util-helpers');
const { Buffer } = require('buffer');
const codec = require('ripple-address-codec');
const { EvernodeHelpers } = require('../evernode-helpers');

const ACQUIRE_WATCH_PREFIX = 'acquire_';
const EXTEND_WATCH_PREFIX = 'extend_';

const DEFAULT_WAIT_TIMEOUT = 60000;

const TenantEvents = {
    AcquireSuccess: EvernodeEvents.AcquireSuccess,
    AcquireError: EvernodeEvents.AcquireError,
    ExtendSuccess: EvernodeEvents.ExtendSuccess,
    ExtendError: EvernodeEvents.ExtendError,
}

class TenantClient extends BaseEvernodeClient {

    #respWatcher = new EventEmitter();

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(TenantEvents), true, options);

        this.on(TenantEvents.AcquireSuccess, (ev) => {
            this.#respWatcher.emit(ACQUIRE_WATCH_PREFIX + ev.acquireRefId, { success: true, data: ev.payload, transaction: ev.transaction });
        });
        this.on(TenantEvents.AcquireError, (ev) => {
            this.#respWatcher.emit(ACQUIRE_WATCH_PREFIX + ev.acquireRefId, { success: false, data: ev.reason, transaction: ev.transaction });
        });

        this.on(TenantEvents.ExtendSuccess, (ev) => {
            this.#respWatcher.emit(EXTEND_WATCH_PREFIX + ev.extendRefId, { success: true, transaction: ev.transaction, expiryMoment: ev.expiryMoment });
        });
        this.on(TenantEvents.ExtendError, (ev) => {
            this.#respWatcher.emit(EXTEND_WATCH_PREFIX + ev.extendRefId, { success: false, data: ev.reason, transaction: ev.transaction });
        });
    }

    async prepareAccount() {
        try {
            if (!await this.xrplAcc.getMessageKey())
                await this.xrplAcc.setAccountFields({ MessageKey: this.accKeyPair.publicKey });
        }
        catch (err) {
            console.log("Error in preparing user xrpl account for Evernode.", err);
        }
    }

    async getLeaseHost(hostAddress) {
        const host = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
        // Find an owned NFT with matching Evernode host NFT prefix.
        const nft = (await host.getNfts()).find(n => n.URI.startsWith(EvernodeConstants.NFT_PREFIX_HEX));
        if (!nft)
            throw { reason: ErrorReasons.HOST_INVALID, error: "Host is not registered." };

        // Check whether the token was actually issued from Evernode registry contract.
        const issuerHex = nft.NFTokenID.substr(8, 40);
        const issuerAddr = codec.encodeAccountID(Buffer.from(issuerHex, 'hex'));
        if (issuerAddr != this.registryAddress)
            throw { reason: ErrorReasons.HOST_INVALID, error: "Host is not registered." };

        // Check whether active.
        const hostInfo = await this.getHostInfo(host.address);
        if (hostInfo)
            throw { reason: ErrorReasons.HOST_INVALID, error: "Host is not registered." };
        else if (hostInfo.active)
            throw { reason: ErrorReasons.HOST_INACTIVE, error: "Host is not active." };

        return host;
    }

    async acquireLeaseSubmit(hostAddress, requirement, options = {}) {

        const hostAcc = await this.getLeaseHost(hostAddress);
        let selectedOfferIndex = options.leaseOfferIndex;

        // Attempt to get first available offer, if offer is not specified in options.
        if (!selectedOfferIndex) {
            const nftOffers = await EvernodeHelpers.getLeaseOffers(hostAcc);
            selectedOfferIndex = nftOffers && nftOffers[0] && nftOffers[0].index;

            if (!selectedOfferIndex)
                throw { reason: ErrorReasons.NO_OFFER, error: "No offers available." };
        }

        // Encrypt the requirements with the host's encryption key (Specified in MessageKey field of the host account).
        const encKey = await hostAcc.getMessageKey();
        if (!encKey)
            throw { reason: ErrorReasons.INTERNAL_ERR, error: "Host encryption key not set." };

        const ecrypted = await EncryptionHelper.encrypt(encKey, requirement, {
            iv: options.iv, // Must be null or 16 bytes.
            ephemPrivateKey: options.ephemPrivateKey // Must be null or 32 bytes.
        });

        return this.xrplAcc.buyNft(selectedOfferIndex, [{ type: MemoTypes.ACQUIRE_LEASE, format: MemoFormats.BASE64, data: ecrypted }], options.transactionOptions);
    }

    watchAcquireResponse(tx, options = {}) {
        return new Promise(async (resolve, reject) => {
            console.log(`Waiting for acquire response... (txHash: ${tx.id})`);

            const watchEvent = ACQUIRE_WATCH_PREFIX + tx.id;

            const failTimeout = setTimeout(() => {
                this.#respWatcher.off(watchEvent);
                reject({ error: ErrorCodes.ACQUIRE_ERR, reason: ErrorReasons.TIMEOUT });
            }, options.timeout || DEFAULT_WAIT_TIMEOUT);

            this.#respWatcher.once(watchEvent, async (ev) => {
                clearTimeout(failTimeout);
                if (ev.success) {
                    const instanceInfo = ev.data;
                    resolve({ instance: instanceInfo.content, transaction: ev.transaction });
                }
                else {
                    reject({ error: ErrorCodes.ACQUIRE_ERR, reason: ev.data, transaction: ev.transaction });
                }
            })
        });
    }

    acquireLease(hostAddress, requirement, options = {}) {
        return new Promise(async (resolve, reject) => {
            const tx = await this.acquireLeaseSubmit(hostAddress, requirement, options).catch(error => {
                reject({ error: ErrorCodes.ACQUIRE_ERR, reason: error.reason || ErrorReasons.TRANSACTION_FAILURE, content: error.error || error });
            });
            if (tx) {
                const response = await this.watchAcquireResponse(tx, options).catch(error => {
                    error.acquireRefId = tx.id;
                    reject(error);
                });
                if (response) {
                    response.acquireRefId = tx.id;
                    resolve(response);
                }
            }
        });
    }

    async extendLeaseSubmit(hostAddress, amount, tokenID, options = {}) {
        const host = await this.getLeaseHost(hostAddress);
        return this.xrplAcc.makePayment(host.address, amount.toString(), EvernodeConstants.EVR, this.config.evrIssuerAddress,
            [{ type: MemoTypes.EXTEND_LEASE, format: MemoFormats.HEX, data: tokenID }], options.transactionOptions);
    }

    watchExtendResponse(tx, options = {}) {
        return new Promise(async (resolve, reject) => {
            console.log(`Waiting for extend lease response... (txHash: ${tx.id})`);

            const watchEvent = EXTEND_WATCH_PREFIX + tx.id;

            const failTimeout = setTimeout(() => {
                this.#respWatcher.off(watchEvent);
                reject({ error: ErrorCodes.EXTEND_ERR, reason: ErrorReasons.TIMEOUT });
            }, options.timeout || DEFAULT_WAIT_TIMEOUT);

            this.#respWatcher.once(watchEvent, async (ev) => {
                clearTimeout(failTimeout);
                if (ev.success) {
                    resolve({ transaction: ev.transaction, expiryMoment: ev.expiryMoment });
                }
                else {
                    reject({ error: ErrorCodes.EXTEND_ERR, reason: ev.data, transaction: ev.transaction });
                }
            })
        });
    }

    extendLease(hostAddress, moments, instanceName, options = {}) {
        return new Promise(async (resolve, reject) => {
            const tokenID = instanceName;
            const nft = (await this.xrplAcc.getNfts())?.find(n => n.NFTokenID == tokenID);

            if (!nft) {
                reject({ error: ErrorCodes.EXTEND_ERR, reason: ErrorReasons.NO_NFT, content: 'Could not find the nft for lease extend request.' });
                return;
            }

            // Get the agreement lease amount from the nft and calculate EVR amount to be sent.
            const uriInfo = UtilHelpers.decodeLeaseNftUri(nft.URI);
            const tx = await this.extendLeaseSubmit(hostAddress, moments * uriInfo.leaseAmount, tokenID, options).catch(error => {
                reject({ error: ErrorCodes.EXTEND_ERR, reason: error.reason || ErrorReasons.TRANSACTION_FAILURE, content: error.error || error });
            });
            if (tx) {
                const response = await this.watchExtendResponse(tx, options).catch(error => {
                    error.extendeRefId = tx.id;
                    reject(error);
                });
                if (response) {
                    response.extendeRefId = tx.id;
                    resolve(response);
                }
            }
        });
    }
}

module.exports = {
    TenantEvents,
    TenantClient
}
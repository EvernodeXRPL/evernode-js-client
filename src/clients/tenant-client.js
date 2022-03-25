const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, MemoFormats, MemoTypes, ErrorCodes, ErrorReasons } = require('../evernode-common');
const { EventEmitter } = require('../event-emitter');
const { EncryptionHelper } = require('../encryption-helper');
const { XrplAccount } = require('../xrpl-account');
const { TransactionHelper } = require('../transaction-helper');

const ACQUIRE_WATCH_PREFIX = 'aquire_';

const TenantEvents = {
    AcquireSuccess: EvernodeEvents.AcquireSuccess,
    AcquireError: EvernodeEvents.AcquireError,
}

class TenantClient extends BaseEvernodeClient {

    #respWatcher = new EventEmitter();

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(TenantEvents), true, options);

        this.on(TenantEvents.AcquireSuccess, async (ev) => {
            this.#respWatcher.emit(ACQUIRE_WATCH_PREFIX + ev.acquireRefId, { success: true, data: ev.payload, transaction: ev.transaction });
        });
        this.on(TenantEvents.AcquireError, async (ev) => {
            this.#respWatcher.emit(ACQUIRE_WATCH_PREFIX + ev.acquireRefId, { success: false, data: ev.reason, transaction: ev.transaction });
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

    async aquireLeaseSubmit(hostAddress, requirement, options = {}) {
        const host = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
        const hostNfts = (await host.getNfts()).filter(nft => nft.URI.startsWith(TransactionHelper.asciiToHex('evrlease').toUpperCase()));
        const hostTokenIDs = hostNfts.map(nft => nft.TokenID);
        const nftOffers = (await host.getNftOffers())?.filter(offer => (offer.Flags == 1 && hostTokenIDs.includes(offer.TokenID))); // Filter only sell offers

        // Accept the offer.
        if (nftOffers && nftOffers.length > 0) {
            // Encrypt the requirements with the host's encryption key (Specified in MessageKey field of the host account).
            const hostAcc = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
            const encKey = await hostAcc.getMessageKey();
            if (!encKey)
                throw "Host encryption key not set.";

            const ecrypted = await EncryptionHelper.encrypt(encKey, requirement, {
                iv: options.iv, // Must be null or 16 bytes.
                ephemPrivateKey: options.ephemPrivateKey // Must be null or 32 bytes.
            });
            return this.xrplAcc.buyNft(nftOffers[0].index, [{ type: MemoTypes.LEASE, format: MemoFormats.BASE64, data: ecrypted }], options.transactionOptions);
        } else
            throw "No offers available.";
    }

    watchAcquireResponse(tx, options = { timeout: 60000 }) {
        return new Promise(async (resolve, reject) => {
            console.log(`Waiting for aquire response... (txHash: ${tx.id})`);

            const watchEvent = ACQUIRE_WATCH_PREFIX + tx.id;

            const failTimeout = setTimeout(() => {
                this.#respWatcher.off(watchEvent);
                reject({ error: ErrorCodes.ACQUIRE_ERR, reason: `acquire_timeout` });
            }, options.timeout);

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
            const tx = await this.aquireLeaseSubmit(hostAddress, requirement, options).catch(errtx => {
                reject({ error: ErrorCodes.ACQUIRE_ERR, reason: ErrorReasons.TRANSACTION_FAILURE, transaction: errtx });
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
}

module.exports = {
    TenantEvents,
    TenantClient
}
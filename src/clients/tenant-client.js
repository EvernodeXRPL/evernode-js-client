const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, MemoFormats, EventTypes, ErrorCodes, ErrorReasons, EvernodeConstants, HookParamKeys, RegExp } = require('../evernode-common');
const { EncryptionHelper } = require('../encryption-helper');
const { Buffer } = require('buffer');
const { XrplAccount } = require('../xrpl-account');
const { UtilHelpers } = require('../util-helpers');
const { EvernodeHelpers } = require('../evernode-helpers');
const { TransactionHelper } = require('../transaction-helper');
const { XrplConstants } = require('../xrpl-common');

const DEFAULT_WAIT_TIMEOUT = 300000;

/**
 * Following tenant-specific events can be subscribed from Evernode client instances.
 * @property {string} AcquireSuccess - Triggered when the tenant receives an acquire success response.
 * @property {string} AcquireError - Triggered when the tenant receives an acquire error response.
 * @property {string} ExtendSuccess - Triggered when the tenant receives an extend success response.
 * @property {string} ExtendError - Triggered when the tenant receives an extend error response.
 */
const TenantEvents = {
    AcquireSuccess: EvernodeEvents.AcquireSuccess,
    AcquireError: EvernodeEvents.AcquireError,
    ExtendSuccess: EvernodeEvents.ExtendSuccess,
    ExtendError: EvernodeEvents.ExtendError,
}

/**
 * TenantClient class to manage tenant operations.
 * It extends the BaseEvernodeClient.
 * @extends BaseEvernodeClient
 */
class TenantClient extends BaseEvernodeClient {

    /**
     * Creates an instance of TenantClient.
     * @param {string} xrpAddress - Xahau wallet address of the tenant.
     * @param {string} xrpSecret - Secret key of the tenant's Xahau wallet.
     * @param {Object} [options={}] - (Optional) A JSON object of options that can include the following properties.
     * @param {string} [options.governorAddress] - (Optional) The Governor Hook Account Xahau address.
     * You can provide your own governorAddress.
     * @param {string} [options.rippledServer] - (Optional) The Rippled server URL.
     * You can provide your own rippledServer URL.
     * @example
     * const tenantAddress = "rKfHBc8e1VemZPLZoPXB7HjSKU2QjkRfP";
     * const tenantSecret = "sszyYJ79AdUUF6dR7QfD9ARWfVuz3";
     * const client = new TenantClient(tenantAddress, tenantSecret, {
     *  governorAddress: "rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL",
     *  rippledServer: "wss://hooks-testnet-v3.xrpl-labs.com"
     * });
     */
    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(TenantEvents), false, options);
    }

    /**
     * Prepare the tenant account with account fields and trust lines.
     * @param {Object} [options={}] - Optional configuration for the account setup.
     */
    async prepareAccount(options = {}) {
        try {
            if (!await this.xrplAcc.getMessageKey())
                await this.xrplAcc.setAccountFields({ MessageKey: this.accKeyPair.publicKey }, options);
        }
        catch (err) {
            console.log("Error in preparing user xrpl account for Evernode.", err);
        }
    }

    /**
     * Retrieves and validates a lease host based on the given host address.
     * @param {string} hostAddress - The XRP Ledger address of the host.
     * @returns {Promise<Object>} - Returns the host object if valid and active.
     * @throws Will throw an error if the host is invalid, inactive, or not registered.
     */
    async getLeaseHost(hostAddress) {
        const host = new XrplAccount(hostAddress, null, { xrplApi: this.xrplApi });
        // Find an owned URI token with matching Evernode host NFT prefix.
        const uriToken = (await host.getURITokens()).find(n => n.URI.startsWith(EvernodeConstants.TOKEN_PREFIX_HEX) && n.Issuer === this.config.registryAddress);
        if (!uriToken)
            throw { reason: ErrorReasons.HOST_INVALID, error: "Host is not registered." };

        // Check whether the token was actually issued from Evernode registry contract.
        if (uriToken.Issuer != this.config.registryAddress)
            throw { reason: ErrorReasons.HOST_INVALID, error: "Host is not registered." };

        // Check whether active.
        const hostInfo = await this.getHostInfo(host.address);
        if (!hostInfo)
            throw { reason: ErrorReasons.HOST_INVALID, error: "Host is not registered." };
        else if (!hostInfo.active)
            throw { reason: ErrorReasons.HOST_INACTIVE, error: "Host is not active." };

        return host;
    }

    /**
     * @description Prepare and submit acquire transaction.(Single signed scenario) This function is called by a tenant client 
     * to submit the acquire lease transaction in a certain host. This function is called within the acquireLease function.
     * This accepts the same parameters passed to the acquireLease function.
     * @param {string} hostAddress XRPL address of the host to acquire the lease.
     * @param {object} requirement The instance requirements and configuration.
     * Ex: { ownerpubkey: "ed5cb83404120ac759609819591ef839b7d222c84f1f08b3012f490586159d2b50", contract_id: "dc411912-bcdd-4f73-af43-32ec45844b9a",  image: "evernodedev/sashimono:hp.latest-ubt.20.04-njs.16", config: {}}
     * For more details about '_config' object , please refer to [**this**](https://docs.evernode.org/en/latest/sdk/hotpocket/reference/configuration.html).
     * @param {object} options [Optional] Options for the XRPL transaction 
     * Ex: { timeout: '<number> This specifies a timeout for the transaction to be completed. It accepts a number and time in milliseconds. This is optional and defaults to 60000 unless provided', 
     * leaseOfferIndex: '<number> The preferred index of the lease available in the given host. An avaialble offer index will be taken unless this field is provided',
     * transactionOptions: '<object> During the acquiring process, an URITokenBuy transaction takes place. Therefore the [fields defined in the official Xahau documentation for the URITokenBuy transaction](https://docs.xahau.network/technical/protocol-reference/transactions/transaction-types/uritokenbuy) can be specified within this object.'}.
     * @returns The transaction result.
     * @example 
     * const tx = await this.acquireLeaseSubmit(hostAddress, requirement);
     * 
     * //response
     * {
     *   id: '<string> The unique hash of the transaction',
     *   code: '<string> Status code of the transaction. It is "tesSUCCESS" if the transaction is successful ex:tesSUCCESS',
     *   details: {
     *     Account: '<string> The unique address of the Xahau account that initiated the transaction',
     *     Amount: {
     *       currency: 'EVR',
     *       issuer: 'ra328vuQhL5fKrjqGB3FzVM45a5zuNS2KR',
     *       value: '2'
     *     },
     *     Fee: '<string> Integer amount of XAH, in drops, to be destroyed as a cost for distributing this transaction to the network',
     *     HookParameters: '[ [Object] ] example:[{HookParameter:{HookParameterName: "4556520100000000000000000000000000000000000000000000000000000002",HookParameterValue: "65766E416371756972654C65617365"}}]
     *      The field values are in hex format. This object represents the event name. If decoded, event name is "evnAcquireLease"',
     *     LastLedgerSequence: '<number> Highest ledger index this transaction can appear in. Specifying this field places a strict upper limit on how long the transaction can wait to be validated or rejected',
     *     Memos: '[ [Object] ] example: [{Memo:{MemoData: "415151474A505044644F694A4D58695333394E626B396A703765564E67644C722F3...",MemoFormat: "626173653634",MemoType: "65766E416371756972654C65617365"}}]
     *      The field values are in hex format. If decoded, "MemoType" has "evnAcquireLease" and "MemoFormat" has "base64" as values. "MemoData" has a string in base64.',
     *     NetworkID: '<number> The networkID is used in the Xahau Hooks library to specify the target network where the hooks will be deployed and executed',
     *     Sequence: '<number> The sequence number of the account sending the transaction. A transaction is only valid if the Sequence number is exactly 1 greater than the previous transaction from the same account',
     *     SigningPubKey: '<string> Hex representation of the public key that corresponds to the private key used to sign this transaction. If an empty string, indicates a multi-signature is present in the Signers field instead',
     *     TransactionType: '<string> The type of transaction. In this situation, it is always "URITokenBuy"',
     *     TxnSignature: '<string> (Automatically added when signing) The signature that verifies this transaction as originating from the account it says it is from',
     *     URITokenID: '<string> Index of the purchased URI Token',
     *     ctid: '<string> Concise identifier of the transaction',
     *     date: '<number> A number of seconds since January 1, 2000 (00:00 UTC) indicating the close time of the ledger in which the transaction was applied. This value does not have a precise relationship with physical time, and is dependent on the close time resolution',
     *     hash: '<string> The SHA-512 hash of the transaction',
     *     inLedger: '<number> (Deprecated) Alias for ledger_index',
     *     ledger_index: '<number> The ledger index of the ledger that includes this transaction',
     *     meta: {
     *       AffectedNodes: [Array],
     *       TransactionIndex: 0,
     *       TransactionResult: 'tesSUCCESS'
     *     },
     *     validated: '<boolean> Whether the transaction is validated or not'
     *   }
     * }
     */
    async acquireLeaseSubmit(hostAddress, requirement, options = {}) {

        const preparedAcquireTxn = await this.prepareAcquireLeaseTransaction(hostAddress, requirement, options);
        return await this.xrplAcc.signAndSubmit(preparedAcquireTxn);
    }

    /**
     * Prepare the Acquire transaction.
     * @param {string} hostAddress XRPL address of the host to acquire the lease.
     * @param {object} requirement The instance requirements and configuration.
     * @param {object} options [Optional] Options for the XRPL transaction.
     * @returns Prepared Acquire transaction.
     */
    async prepareAcquireLeaseTransaction(hostAddress, requirement, options = {}) {

        const hostAcc = await this.getLeaseHost(hostAddress);
        let selectedOfferIndex = options.leaseOfferIndex;

        let buyUriOffer = null;
        const uriTokenOffers = await EvernodeHelpers.getLeaseOffers(hostAcc);

        if (!selectedOfferIndex) {
            // Attempt to get first available offer, if offer is not specified in options.
            buyUriOffer = uriTokenOffers && uriTokenOffers[0];
        }
        else {
            // Attempt to get relevant available offer using selectedOfferIndex.
            buyUriOffer = uriTokenOffers && uriTokenOffers.find(uriOffer => (uriOffer.index === selectedOfferIndex));
        }

        if (!buyUriOffer)
            throw { reason: ErrorReasons.NO_OFFER, error: "No offers available." };

        let encKey = null;
        let doEncrypt = true;
        // Initialize with not-encrypted prefix flag and the data.
        let data = Buffer.concat([Buffer.from([0x00]), Buffer.from(JSON.stringify(requirement))]).toString('base64');

        if ('messageKey' in options) {
            if (options.messageKey !== 'none' && RegExp.PublicPrivateKey.test(options.messageKey)) {
                encKey = options.messageKey;
            } else if (options.messageKey === 'none') {
                doEncrypt = false;
            } else
                throw { reason: ErrorReasons.INTERNAL_ERR, error: "Host encryption key not valid." };
        } else {
            encKey = await hostAcc.getMessageKey();
        }

        if (doEncrypt) {
            if (!encKey)
                throw { reason: ErrorReasons.INTERNAL_ERR, error: "Host encryption key not set." };
            const encrypted = await EncryptionHelper.encrypt(encKey, requirement, {
                iv: options.iv, // Must be null or 16 bytes.
                ephemPrivateKey: options.ephemPrivateKey // Must be null or 32 bytes.
            });
            // Override encrypted prefix flag and the data.
            data = Buffer.concat([Buffer.from([0x01]), Buffer.from(encrypted, 'base64')]).toString('base64');
        }

        return await this.xrplAcc.prepareBuyURIToken(
            buyUriOffer,
            [
                { type: EventTypes.ACQUIRE_LEASE, format: MemoFormats.BASE64, data: data }
            ],
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.ACQUIRE_LEASE }
                ],
                ...options.transactionOptions
            });
    }

    /**
     * @description Watch for the acquire-success response after the acquire request is made.
     * This function watches for an acquire-success response(transaction) and returns the response or throws the error response on acquire-error response from the host Xahau account. 
     * This function is called within the acquireLease function. This accepts two parameters as below.
     * @param {object} tx The transaction returned by the acquireLeaseSubmit function.
     * @param {object} options [Optional] Options for the XRPL transaction.
     * @returns An object including transaction details,instance info, and acquireReference Id.
     * @example const response = await watchAcquireResponse(tx);
     * 
     * //sample response
     * {
     *   transaction: {
     *     Account: '<string> The unique address of the account that initiated the transaction',
     *     Amount: '<string> The amount of currency to deliver',
     *     Destination: '<string> The address of the tenant account which made the acquireLease request',
     *     Fee: '<string> Integer amount of EVRs, in drops, to be destroyed as a cost for distributing this transaction to the network. Some transaction types have different minimum requirements',
     *     HookParameters: [ [Object], [Object] ],
     *     LastLedgerSequence: '<number> Highest ledger index this transaction can appear in. Specifying this field places a strict upper limit on how long the transaction can wait to be validated or rejected',
     *     Memos: '[ [Object] ] Ex: [{name: "4556520100000000000000000000000000000000000000000000000000000002",value: "evnAcquireSuccess"},{name: "4556520100000000000000000000000000000000000000000000000000000003",value: "5267C171CF0438C21773B26A108021D31F6CFF8AB02A0F99E410669B5B448353"}]'
     *      The field names are in hex format. First object represents the event name which is "evnAcquireSuccess". Second object represents the event data.,
     *     NetworkID: '<number> The networkID is used in the Xahau Hooks library to specify the target network where the hooks will be deployed and executed',
     *     Sequence: '<number> The sequence number of the account sending the transaction. A transaction is only valid if the Sequence number is exactly 1 greater than the previous transaction from the same account',
     *     SigningPubKey: '<string> Hex representation of the public key that corresponds to the private key used to sign this transaction. If an empty string, indicates a multi-signature is present in the Signers field instead',
     *     TransactionType: '<string> The type of transaction. In this situation, it is always "Payment"',
     *     TxnSignature: '<string> (Automatically added when signing) The signature that verifies this transaction as originating from the account it says it is from.',
     *     ctid: '<string> Concise identifier of the transaction',
     *     date: '<number> A number of seconds since January 1, 2000 (00:00 UTC) indicating the close time of the ledger in which the transaction was applied. This value does not have a precise relationship with physical time, and is dependent on the close time resolution',
     *     hash: '<string> The SHA-512 hash of the transaction',
     *     inLedger: '<number> (Deprecated) Alias for ledger_index',
     *     ledger_index: '<number> The ledger index of the ledger that includes this transaction',
     *     DeliveredAmount: '<string> The amount of currency that actually reached the Destination'
     *   },
     *   instance: {
     *     name: '<string> The unique identifier of the instance. This is the URITokenID acquired during the registration',
     *     pubkey: 'ed498b870a3ec9a561b93e89f21800a28d718b3fa0bdd20b894368f5fe89251b13',
     *     contract_id: '<string> The unique contract identifier',
     *     peer_port: '<string> The port used for the communication among the instances in the cluster',
     *     user_port: '<string> The port used for the communication between the user and the instance',
     *     domain: '<string> The public domain address of the host server'
     *   },
     *   acquireRefId: '<string> The hash of the transaction that requested the initial acquiring of the instance'
     * }
     */
    async watchAcquireResponse(tx, options = {}) {
        console.log(`Waiting for acquire response... (txHash: ${tx.id})`);

        return new Promise(async (resolve, reject) => {
            let rejected = false;
            const failTimeout = setTimeout(() => {
                rejected = true;
                reject({ error: ErrorCodes.ACQUIRE_ERR, reason: ErrorReasons.TIMEOUT });
            }, options.timeout || DEFAULT_WAIT_TIMEOUT);

            let relevantTx = null;
            while (!rejected && !relevantTx) {
                try {
                    const txList = await this.xrplAcc.getAccountTrx(tx.details.ledger_index);
                    for (let t of txList) {
                        t.tx.Memos = TransactionHelper.deserializeMemos(t.tx?.Memos);
                        t.tx.HookParameters = TransactionHelper.deserializeHookParams(t.tx?.HookParameters);

                        if (t.meta?.delivered_amount)
                            t.tx.DeliveredAmount = t.meta.delivered_amount;

                        const res = await this.extractEvernodeEvent(t.tx);
                        if ((res?.name === EvernodeEvents.AcquireSuccess || res?.name === EvernodeEvents.AcquireError) && res?.data?.acquireRefId === tx.id) {
                            clearTimeout(failTimeout);
                            relevantTx = res;
                            break;
                        }
                    }
                }
                catch (e) {
                    rejected = true;
                    clearTimeout(failTimeout);
                    reject({ error: ErrorCodes.ACQUIRE_ERR, reason: 'UNKNOWN', acquireRefId: tx.id });
                    break;
                }
                await new Promise(resolveSleep => setTimeout(resolveSleep, 2000));
            }

            if (!rejected) {
                if (relevantTx?.name === TenantEvents.AcquireSuccess) {
                    resolve({
                        transaction: relevantTx?.data.transaction,
                        instance: relevantTx?.data.payload.content,
                        acquireRefId: relevantTx?.data.acquireRefId
                    });
                } else if (relevantTx?.name === TenantEvents.AcquireError) {
                    reject({
                        error: ErrorCodes.ACQUIRE_ERR,
                        transaction: relevantTx?.data.transaction,
                        reason: relevantTx?.data.reason,
                        acquireRefId: relevantTx?.data.acquireRefId
                    });
                }
            }
        });
    }

    /**
     * Acquires an available instance on a specified host. This function can takes three parameters ans is as follows.
     * @async
     * @param {string} hostAddress - The wallet address of the host where the HotPocket instance will be created.
     * @param {Object} requirement - The details necessary for creating the instance.
     * @param {string} requirement.owner_pubkey - The public key of the tenant.
     * @param {string} requirement.contract_id - The unique contract identifier.
     * @param {string} requirement.image - The image used to create the HotPocket instance.
     * @param {Object} requirement.config - Configuration object for the instance. 
     * Note: Providing all the configurations herewith can cause _'TRANSACTION_FAILURE'_ error due to exceeding the maximum allowed memo size for now.
     * For more details about '_config' object , please refer to https://docs.evernode.org/en/latest/sdk/hotpocket/reference/configuration.html.
     * @param {Object} [options={}] - Optional configurations for the transaction.
     * @param {number} [options.timeout=60000] - Timeout for the transaction in milliseconds.
     * This is optional and defaults to 60000 unless provided.
     * @param {string} [options.leaseOfferIndex] - The index of the preferred lease offer from the host.
     * An avaialble offer index will be taken unless this field is provided.
     * @param {Object} [options.transactionOptions] - Options for the URITokenBuy transaction as defined in the Xahau documentation.
     * During the acquiring process, an URITokenBuy transaction takes place.
     * Therefore the [fields defined in the official Xahau documentation for the URITokenBuy transaction](https://docs.xahau.network/technical/protocol-reference/transactions/transaction-types/uritokenbuy) can be specified within this object.
     * @returns {Promise<Object>} Resolves with an object containing the transaction details and instance details.<br>
     * @returns {Object} transaction - Information about the transaction.<br>
     * @returns {string} transaction.Account - The address of the account initiating the transaction.<br>
     * @returns {string} transaction.Amount - The amount of currency transferred.<br>
     * @returns {string} transaction.Destination - The tenant's account address.<br>
     * @returns {string} transaction.Fee - The fee paid for the transaction, in EVR drops.<br>
     * @returns {number} transaction.LastLedgerSequence - The latest ledger sequence for the transaction.<br>
     * @returns {Object[]} transaction.Memos - Array of memo objects.<br>
     * @returns {string} transaction.hash - The SHA-512 hash of the transaction.<br>
     * @returns {number} transaction.ledger_index - The ledger index containing the transaction.<br>
     * @returns {string} transaction.DeliveredAmount - The actual amount delivered to the destination.<br>
     * @returns {Object} instance - Information about the acquired instance.<br>
     * @returns {string} instance.name - The unique identifier (URITokenID) of the instance.<br>
     * @returns {string} instance.pubkey - The public key of the instance.<br>
     * @returns {string} instance.contract_id - The unique contract identifier.<br>
     * @returns {string} instance.peer_port - The port used for peer communication.<br>
     * @returns {string} instance.user_port - The port used for user communication.<br>
     * @returns {string} instance.domain - The public domain of the host server.<br>
     * @returns {string} acquireRefId - The reference ID for the acquisition.
     * 
     * @throws {Error} Throws an error if the acquisition fails.
     * @throws {Object} error - The error object with details about the failure.
     * @throws {string} error.error - The error code ('ACQUIRE_ERR').
     * @throws {string} error.reason - The reason for the acquisition failure.
     * @throws {Object} error.transaction - The transaction details associated with the failed acquisition.
     * @throws {string} error.transaction.Account - The tenant's account address.
     * @throws {Object} error.transaction.Amount - The refund details.
     * @throws {string} error.transaction.Amount.currency - The currency type (e.g., 'EVR').
     * @throws {string} error.transaction.Amount.issuer - The issuer of the currency.
     * @throws {string} error.transaction.Amount.value - The value of the refunded amount.
     * @throws {string} error.transaction.Destination - The tenant's account address.
     * @throws {string} error.transaction.Fee - The transaction fee.
     * @throws {Object[]} error.transaction.HookParameters - Contains event name and event data.
     * @throws {string} error.transaction.HookParameters[].name - The event name (in hex format).
     * @throws {string} error.transaction.HookParameters[].value - The event data (in hex format).
     * @throws {string} error.acquireRefId - The reference ID for the failed acquisition request.
     * @example
     * const result = await tenant.acquireLease(
     *   "rnET2YR19WDP4vB8XtDhcF2J4afqMM6xim",
     *   {
     *     owner_pubkey: "ed5cb83404120ac759609819591ef839b7d222c84f1f08b3012f490586159d2b50",
     *     contract_id: "dc411912-bcdd-4f73-af43-32ec45844b9a",
     *     image: "evernodedev/sashimono:hp.latest-ubt.20.04-njs.16",
     *     config: {}
     *   },
     *   { timeout: 10000 }
     * );
     * console.log("Tenant received instance:", result);
     * 
     * //Returns a promise that resolves with an object similar to the following sample response object.
     * {
     *   transaction: {
     *     Account: '<string> The unique address of the account that initiated the transaction',
     *     Amount: '<string> The amount of currency to deliver',
     *     Destination: '<string> The address of the tenant account which made the acquireLease request',
     *     Fee: '<string> Integer amount of EVRs, in drops, to be destroyed as a cost for distributing this transaction to the network. Some transaction types have different minimum requirements',
     *     HookParameters: '[ [Object], [Object] ] This contains 2 objects as follows [{name: "4556520100000000000000000000000000000000000000000000000000000002",value:"evnAcquireSuccess"},{name:"4556520100000000000000000000000000000000000000000000000000000003",value:"5267C171CF0438C21773B26A108021D31F6CFF8AB02A0F99E410669B5B448353"}]
     *      The field names are in hex format. First object represents the event name which is 'evnAcquireSuccess'. Second object represents the event data',
     *     LastLedgerSequence: '<number> Highest ledger index this transaction can appear in. Specifying this field places a strict upper limit on how long the transaction can wait to be validated or rejected',
     *     Memos: '[ [Object] ] This array contains one object. The following is an example: [{type: "evnAcquireSuccess",format:"base64",data:"QVFSUUFtQ2xOa3VVc3YyVnpkWlhWVG8xaGhjVDZ1YnlOSFJ..."}] 
     *      Data in "data" field in each object are encoded in the format mentioned in "format" field."data" field in first object contains the encrypted information about the instance, which can be found in other fields of the response object.
     *      "data" in the second object contains the hex representation of the hash of acquiring request transaction.',
     *     NetworkID: '<number> The networkID is used in the Xahau Hooks library to specify the target network where the hooks will be deployed and executed',
     *     Sequence: '<number> The sequence number of the account sending the transaction. A transaction is only valid if the Sequence number is exactly 1 greater than the previous transaction from the same account',
     *     SigningPubKey: '<string> Hex representation of the public key that corresponds to the private key used to sign this transaction. If an empty string, indicates a multi-signature is present in the Signers field instead',
     *     TransactionType: '<string> The type of transaction. In this situation, it is always "Payment"',
     *     TxnSignature: '<string> (Automatically added when signing) The signature that verifies this transaction as originating from the account it says it is from',
     *     ctid: '<string> Concise identifier of the transaction',
     *     date: '<number> A number of seconds since January 1, 2000 (00:00 UTC) indicating the close time of the ledger in which the transaction was applied. This value does not have a precise relationship with physical time, and is dependent on the close time resolution',
     *     hash: '<string> The SHA-512 hash of the transaction',
     *     inLedger: '<string> (Deprecated) Alias for ledger_index',
     *     ledger_index: '<number> The ledger index of the ledger that includes this transaction',
     *     DeliveredAmount: '<string> The amount of currency that actually reached the Destination'
     *   },
     *   instance: {
     *     name: '<string> The unique identifier of the instance. This is the URITokenID acquired during the registration',
     *     pubkey: 'edd60480dbe1e1de3ef8a06362c3e198f70b1b0f14f73c5cdce1431b61b866a706',
     *     contract_id: '<string> The unique contract identifier',
     *     peer_port: '<string> The port used for the communication among the instances in the cluster',
     *     user_port: '<string> The port used for the communication between the user and the instance',
     *     domain: '<string> The public domain address of the host server'
     *   },
     *   acquireRefId: '<string> The hash of the transaction that requested the initial acquiring of the instance'
     * }
     * 
     * //On error, this functions rejects the promise with an error object similar to the following
     * error: '<string> Error code: "ACQUIRE_ERR"',
     *   transaction: {
     *     Account: 'rrssGm5h8aWncB3CGMuQ2WGfexubbeCTLV',
     *     Amount: ' <object> An instance acquisition costs 2 EVRs and this transaction returns that 2 EVRs back due to acquisition failure. This object contains the three fields shown in the example code above
     *      {currency: "EVR",issuer: "r9gYbjBfANRfA1JHfaCVfPPGfXYiqQvmhS",value: "2"}',
     *     Destination: 'rnq9njowRVpoz9ZxEMJacuJkHPPwGvA1J9',
     *     Fee: '20',
     *     Flags: 0,
     *     HookParameters: [ [Object], [Object] ],
     *     LastLedgerSequence: 3906113,
     *     Memos: '[ [Object] ] Data in "data" field in each object are encoded in the format mentioned in "format" field. "data" field in first object contains the encrypted information about the instance,
     *      which can be found in other fields of the response object. "data" in the second object contains the hex representation of the hash of acquiring request transaction.
     *      Example  [{type: "evnAcquireError",format: "text/json",data: "{"type":"ACQUIRE_ERR","reason":"user_install_error"}"}]',
     *     NetworkID: 21338,
     *     Sequence: 1974828,
     *     SigningPubKey: '03F27A7309A6B5234EA427B19E84A47C3505DE1C2D1F5BEACBF78C0CF3BE6E5CF1',
     *     TransactionType: 'Payment',
     *     TxnSignature: '304402205BB2EFE4AEB6E32794F303B851D22EF6C413D4070EA9D7A909BE29D10A05FBE8022061718C1225CDADFD8768C055F0D1EDA1738218DB3666262D83E509E2FA1603DF',
     *     date: 739970990,
     *     hash: '2F6D8D3D39C1E11AFC8F7ECFF16561C56FFF50C4F6EDA0EFCB7ADA0E5D2DCD8F',
     *     inLedger: 3906105,
     *     ledger_index: 3906105
     *   },
     *   reason: '<string> Reason for the failure of acquisition (user_install_error)',
     *   acquireRefId: 'C2083FE39D76435A877D5408FF279C2F2B906C3168864F9B7440C134157881B0'
     * }
     */
    acquireLease(hostAddress, requirement, options = {}) {
        return new Promise(async (resolve, reject) => {
            const tx = await this.acquireLeaseSubmit(hostAddress, requirement, options).catch(error => {
                reject({ error: ErrorCodes.ACQUIRE_ERR, reason: error.reason || ErrorReasons.TRANSACTION_FAILURE, content: error.error || error });
            });
            if (tx) {
                try {
                    const response = await this.watchAcquireResponse(tx, options);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    /**
     * @description This function is called by a tenant client to submit the extend lease transaction in certain host. This function will be called inside extendLease function. This function can take four parameters as follows.
     * @param {string} hostAddress XRPL account address of the host.
     * @param {number} amount Cost for the extended moments , in EVRs.
     * @param {string} tokenID Tenant received instance name. this name can be retrieve by performing acquire Lease.
     * @param {object} options This is an optional field and contains necessary details for the transactions.
     * @param {object} [options.transactionOptions] During the extending lease process, a Payment transaction takes place. Therefore the fields defined in the official Xahau documentation for the Payment transaction can be specified within this object.
     * @returns The transaction result.
     * @example const tx = await this.extendLeaseSubmit(hostAddress, amount, tokenID, options);
     * 
     * //example response
     * exampleResponse  {
     *   id: '<string> The unique hash of the transaction',
     *   code: '<string> Status code of the transaction. It is "tesSUCCESS" if the transaction is successful',
     *   details: {
     *     Account: '<string> The unique address of the account that initiated the transaction',
     *     Amount: {
     *       currency: 'EVR',
     *       issuer: 'ra328vuQhL5fKrjqGB3FzVM45a5zuNS2KR',
     *       value: '4'
     *     },
     *     Destination: '<string> Tenant Xahau address that made the extend lease request',
     *     Fee: '<string> Integer amount of EVRs, in drops, to be destroyed as a cost for distributing this transaction to the network. Some transaction types have different minimum requirements',
     *     HookParameters:'[[Object],[Object]] Ex:[{HookParameter:{HookParameterName:"4556520100000000000000000000000000000000000000000000000000000002",HookParameterValue:"65766E457874656E644C65617365"}},{HookParameter:{HookParameterName:"4556520100000000000000000000000000000000000000000000000000000003",HookParameterValue:"34FB3A3426DB37FF69D9BDF62AB503B858BC7BEF24BD5F97CCBED17A61D4A6C5"}}]',
     *      The field values are in hex format. First object represents the event name which is "evnExtendLease" after decoding. Second object represents the event data.
     *     LastLedgerSequence: "<number> Highest ledger index this transaction can appear in. Specifying this field places a strict upper limit on how long the transaction can wait to be validated or rejected.",
     *     Memos: '[] Additional arbitrary information used to identify this transaction.',
     *     NetworkID: '<number> The networkID is used in the Xahau Hooks library to specify the target network where the hooks will be deployed and executed.',
     *     Sequence: '<number> The sequence number of the account sending the transaction. A transaction is only valid if the Sequence number is exactly 1 greater than the previous transaction from the same account',
     *     SigningPubKey: '<string> Hex representation of the public key that corresponds to the private key used to sign this transaction. If an empty string, indicates a multi-signature is present in the Signers field instead.',
     *     TransactionType: '<string> The type of transaction. Valid types include: Payment',
     *     TxnSignature: '<string> (Automatically added when signing) The signature that verifies this transaction as originating from the account it says it is from.',
     *     ctid: '<string> Concise identifier of the transaction.',
     *     date: '<number> A number of seconds since January 1, 2000 (00:00 UTC) indicating the close time of the ledger in which the transaction was applied. This value does not have a precise relationship with physical time, and is dependent on the close time resolution.',
     *     hash: '<string> Every signed transaction has a unique "hash" that identifies it. The server provides the hash in the response when you submit the transaction',
     *     inLedger: '<number> (Deprecated) Alias for ledger_index.',
     *     ledger_index: '<number> The ledger index of the ledger that includes this transaction.',
     *     meta: {
     *       AffectedNodes: [Array],
     *       TransactionIndex: 2,
     *       TransactionResult: 'tesSUCCESS',
     *       delivered_amount: [Object]
     *     },
     *     validated: '<boolean> Whether the transaction is validated or not.'
     *   }
     * } 
     */
    async extendLeaseSubmit(hostAddress, amount, tokenID, options = {}) {
        const preparedExtendTxn = await this.prepareExtendLeaseTransaction(hostAddress, amount, tokenID, options);
        return await this.xrplAcc.signAndSubmit(preparedExtendTxn);
    }

    /**
     * This function is called to prepare an instance extension transaction for a particular host.
     * @param {string} hostAddress XRPL account address of the host.
     * @param {number} amount Cost for the extended moments , in EVRs.
     * @param {string} tokenID Tenant received instance name. this name can be retrieve by performing acquire Lease.
     * @param {object} options This is an optional field and contains necessary details for the transactions.
     * @returns The prepared transaction.
     */
    async prepareExtendLeaseTransaction(hostAddress, amount, tokenID, options = {}) {
        const host = await this.getLeaseHost(hostAddress);
        return await this.xrplAcc.prepareMakePayment(
            host.address, amount.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            null,
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.EXTEND_LEASE },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: tokenID }
                ],
                ...options.transactionOptions
            });
    }

    /**
     * This function watches for an extendlease-success response(transaction) and returns the response or throws the error response on extendlease-error response from the host XRPL account. This function is called within the extendLease function.
     * @param {object} tx Response of extendLeaseSubmit.
     * @param {object} options This is an optional field and contains necessary details for the transactions.
     * @param {number} [options.timeout=60000] -  This specifies a timeout for the transaction to be completed. it accepts a number and time in milliseconds. this is optional and defaults to 60000 unless provided.
     * @returns An object including transaction details.
     * @example 
     * //example request
     * const response = await this.watchExtendResponse(tx, options);
     * 
     * //An example of a successful response:
     * exampleResponse {
     *   transaction: {
     *     Account: '<string> The unique address of the account that initiated the transaction.',
     *     Amount: '<string> To specify an amount of XAH, use a String Number indicating drops of XAH, where each drop is equal to 0.000001 XAH. For example, to specify 13.1 XAH : "13100000"',
     *     Destination: '<string> Tenant Xahau address that made the extend lease request.',
     *     Fee: '<string> Integer amount of EVRs, in drops, to be destroyed as a cost for distributing this transaction to the network. Some transaction types have different minimum requirements.',
     *     HookParameters: '[ [Object], [Object] ] This contains 2 objects as follows,[{name: "4556520100000000000000000000000000000000000000000000000000000002",value: "evnExtendSuccess"},
     *      { name: "4556520100000000000000000000000000000000000000000000000000000003",value: "CC3A5C7D8CE4DF0962A8E702EBD2BFA439D4FEC1C3F72AF2BF18604FE5F1675E" }]
     *      The field values are in hex format. First object represents the event name which is "evnExtendSuccess". Second object represents the event data.' ,
     *     LastLedgerSequence: '<number> Highest ledger index this transaction can appear in. Specifying this field places a strict upper limit on how long the transaction can wait to be validated or rejected.',
     *     Memos: '[ [Object] ] This array contains one object. The following is an example: [{type:"evnExtendSuccess",format:"hex",data:"00000002"}] Data in "data" field in each object are encoded in the format mentioned in 'format' field.
     *      "data" field in first object contains the encrypted information about the instance, which can be found in other fields of the response object."data" in the second object contains the hex representation of the hash of acquiring request transaction',
     *     NetworkID: '<number> The networkID is used in the Xahau Hooks library to specify the target network where the hooks will be deployed and executed',
     *     Sequence: '<numeber> The sequence number of the account sending the transaction. A transaction is only valid if the Sequence number is exactly 1 greater than the previous transaction from the same account',
     *     SigningPubKey: '<string> Hex representation of the public key that corresponds to the private key used to sign this transaction. If an empty string, indicates a multi-signature is present in the Signers field instead',
     *     TransactionType: '<string> The type of transaction. Valid types include: Payment',
     *     TxnSignature: '<string> (Automatically added when signing) The signature that verifies this transaction as originating from the account it says it is from',
     *     ctid: '<string> Concise identifier of the transaction',
     *     date: '<number> A number of seconds since January 1, 2000 (00:00 UTC) indicating the close time of the ledger in which the transaction was applied. This value does not have a precise relationship with physical time, and is dependent on the close time resolution',
     *     hash: '<string> Every signed transaction has a unique "hash" that identifies it. The server provides the hash in the response when you submit the transaction',
     *     inLedger: '<number> (Deprecated) Alias for ledger_index',
     *     ledger_index: '<number> The ledger index of the ledger that includes this transaction',
     *     DeliveredAmount: '<string> The amount of currency that actually reached the Destination'
     *   },
     *   expiryMoment: '<number> Defines which moment instance going to expire',
     *   extendRefId: '28F50AC675DBD0444C51934F35BA328B6B24C6EA60805674FB791D61E20610D1'
     * }
     */
    async watchExtendResponse(tx, options = {}) {
        console.log(`Waiting for extend lease response... (txHash: ${tx.id})`);

        return new Promise(async (resolve, reject) => {
            let rejected = false;
            const failTimeout = setTimeout(() => {
                rejected = true;
                reject({ error: ErrorCodes.EXTEND_ERR, reason: ErrorReasons.TIMEOUT });
            }, options.timeout || DEFAULT_WAIT_TIMEOUT);

            let relevantTx = null;
            while (!rejected && !relevantTx) {
                try {
                    const txList = await this.xrplAcc.getAccountTrx(tx.details.ledger_index);
                    for (let t of txList) {
                        t.tx.Memos = TransactionHelper.deserializeMemos(t.tx.Memos);
                        t.tx.HookParameters = TransactionHelper.deserializeHookParams(t.tx?.HookParameters);

                        if (t.meta?.delivered_amount)
                            t.tx.DeliveredAmount = t.meta.delivered_amount;

                        const res = await this.extractEvernodeEvent(t.tx);
                        if ((res?.name === TenantEvents.ExtendSuccess || res?.name === TenantEvents.ExtendError) && res?.data?.extendRefId === tx.id) {
                            clearTimeout(failTimeout);
                            relevantTx = res;
                            break;
                        }
                    }
                }
                catch (e) {
                    rejected = true;
                    clearTimeout(failTimeout);
                    reject({ error: ErrorCodes.EXTEND_ERR, reason: 'UNKNOWN', extendRefId: tx.id });
                    break;
                }
                await new Promise(resolveSleep => setTimeout(resolveSleep, 1000));
            }

            if (!rejected) {
                if (relevantTx?.name === TenantEvents.ExtendSuccess) {
                    resolve({
                        transaction: relevantTx?.data.transaction,
                        expiryMoment: relevantTx?.data.expiryMoment,
                        extendRefId: relevantTx?.data.extendRefId
                    });
                } else if (relevantTx?.name === TenantEvents.ExtendError) {
                    reject({
                        error: ErrorCodes.EXTEND_ERR,
                        transaction: relevantTx?.data.transaction,
                        reason: relevantTx?.data.reason,
                        extendRefId: relevantTx?.data.extendRefId
                    });
                }
            }
        });
    }

    /**
     * @description This function is called by a tenant client to extend an available instance in certain host. This function can take four parameters as follows.
     * @param {string} hostAddress XRPL account address of the host. example: "rKtuh3pGwkPk86BuVrPNS58JkyMuz79DbB".
     * @param {number} moments 1190 ledgers (est. 1 hour) .
     * @param {string} instanceName Tenant received instance name. this name can be retrieve by performing acquire Lease.
     * @param {object} options This is an optional field and contains necessary details for the transactions.
     * @param {string} [options.transactionOptions] During the extending lease process, a Payment transaction takes place. Therefore the fields defined in the official Xahau documentation for the Payment transaction can be specified within this object
     * @param {string} [options.timeout] This specifies a timeout for the transaction to be completed. it accepts a number and time in milliseconds. this is optional and defaults to 60000 unless provided.
     * @returns An object including transaction details.
     * @example const result = await tenant.extendLease(hostAddress, moments, instanceName, {  timeout: timeout,});
     * 
     * //example response
     * exampleResponse {
     *   transaction: {
     *     Account: '<string> The unique address of the account that initiated the transaction',
     *     Amount: '<string> To specify an amount of XAH, use a String Number indicating drops of XAH, where each drop is equal to 0.000001 XAH.For example, to specify 13.1 XAH : "13100000"',
     *     Destination: '<string> Tenant Xahau address that made the extend lease request',
     *     Fee: '<string> nteger amount of EVRs, in drops, to be destroyed as a cost for distributing this transaction to the network. Some transaction types have different minimum requirements',
     *     HookParameters: '[ [Object],[Object]][{name: "4556520100000000000000000000000000000000000000000000000000000002",value: "evnExtendSuccess"},{name: "4556520100000000000000000000000000000000000000000000000000000003",value: "CC3A5C7D8CE4DF0962A8E702EBD2BFA439D4FEC1C3F72AF2BF18604FE5F1675E"}]'
     *      The field values are in hex format. First object represents the event name which is 'evnExtendSuccess'. Second object represents the event data.,
     *     LastLedgerSequence: '<number> Highest ledger index this transaction can appear in. Specifying this field places a strict upper limit on how long the transaction can wait to be validated or rejected',
     *     Memos: '[ [Object] ] Ex: [{type: "evnExtendSuccess",format: "hex",data: "00000002"  }]
     *      Data in "data" field in each object are encoded in the format mentioned in "format" field."data" field in first object contains the encrypted information about the instance, which can be found in other fields of the response object. "data" in the second object contains the hex representation of the hash of acquiring request transaction.',
     *     NetworkID: '<number> The networkID is used in the Xahau Hooks library to specify the target network where the hooks will be deployed and executed',
     *     Sequence: '<number> The sequence number of the account sending the transaction. A transaction is only valid if the Sequence number is exactly 1 greater than the previous transaction from the same account',
     *     SigningPubKey: '<string> Hex representation of the public key that corresponds to the private key used to sign this transaction. If an empty string, indicates a multi-signature is present in the Signers field instead',
     *     TransactionType: '<string> The type of transaction. Valid types include: Payment',
     *     TxnSignature: '<string> (Automatically added when signing) The signature that verifies this transaction as originating from the account it says it is from',
     *     ctid: '<string> Concise identifier of the transaction',
     *     date: '<string> A number of seconds since January 1, 2000 (00:00 UTC) indicating the close time of the ledger in which the transaction was applied. This value does not have a precise relationship with physical time, and is dependent on the close time resolution.',
     *     hash: '<string> Every signed transaction has a unique "hash" that identifies it. The server provides the hash in the response when you submit the transaction',
     *     inLedger: '<number> (Deprecated) Alias for ledger_index',
     *     ledger_index: '<number> The ledger index of the ledger that includes this transaction',
     *     DeliveredAmount: '<string> The amount of currency that actually reached the Destination'
     *   },
     *   expiryMoment: '<number> Defines which moment instance going to expire',
     *   extendRefId: '<string> Transaction ID of the extend request'
     * }
     */
    extendLease(hostAddress, moments, instanceName, options = {}) {
        return new Promise(async (resolve, reject) => {
            const tokenID = instanceName;
            const uriToken = (await this.xrplAcc.getURITokens())?.find(n => n.index == tokenID);

            if (!uriToken) {
                reject({ error: ErrorCodes.EXTEND_ERR, reason: ErrorReasons.NO_TOKEN, content: 'Could not find the uri token for lease extend request.' });
                return;
            }

            let minLedgerIndex = this.xrplApi.ledgerIndex;

            // Get the agreement lease amount from the nft and calculate EVR amount to be sent.
            const uriInfo = UtilHelpers.decodeLeaseTokenUri(uriToken.URI);
            const tx = await this.extendLeaseSubmit(hostAddress, moments * uriInfo.leaseAmount, tokenID, options).catch(error => {
                reject({ error: ErrorCodes.EXTEND_ERR, reason: error.reason || ErrorReasons.TRANSACTION_FAILURE, content: error.error || error });
            });

            if (tx) {
                try {
                    const response = await this.watchExtendResponse(tx, minLedgerIndex, options)
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            }
        });
    }

    /**
     * Terminate the lease instance.
     * @param {string} uriTokenId Hex URI token id of the lease.
     */
    async terminateLease(uriTokenId, options = {}) {
        const uriToken = await this.xrplApi.getURITokenByIndex(uriTokenId);
        if (uriToken && uriToken.Owner === this.xrplAcc.address) {
            await this.xrplAcc.makePayment(uriToken.Issuer, XrplConstants.MIN_DROPS, null, null, null,
                {
                    hookParams: [
                        { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.TERMINATE_LEASE },
                        { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: uriTokenId }
                    ],
                    ...options.transactionOptions
                });
        }
        else {
            console.log(`Uri token ${uriTokenId} not found or already burned. Burn skipped.`);
        }
    }
}

module.exports = {
    TenantEvents,
    TenantClient
}

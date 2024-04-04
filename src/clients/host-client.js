const { XrplConstants } = require('../xrpl-common');
const { BaseEvernodeClient } = require('./base-evernode-client');
const { EvernodeEvents, EvernodeConstants, MemoFormats, EventTypes, ErrorCodes, HookParamKeys, RegExp, ReputationConstants } = require('../evernode-common');
const { XrplAccount } = require('../xrpl-account');
const { EncryptionHelper } = require('../encryption-helper');
const { Buffer } = require('buffer');
const codec = require('ripple-address-codec');
const { XflHelpers } = require('../xfl-helpers');
const { EvernodeHelpers } = require('../evernode-helpers');
const { StateHelpers } = require('../state-helpers');
const { TransactionHelper } = require('../transaction-helper');
const { UtilHelpers } = require('../util-helpers');

const OFFER_WAIT_TIMEOUT = 60;

const HostEvents = {
    AcquireLease: EvernodeEvents.AcquireLease,
    ExtendLease: EvernodeEvents.ExtendLease
}

const HOST_COUNTRY_CODE_PARAM_OFFSET = 0;
const HOST_CPU_MICROSEC_PARAM_OFFSET = 2;
const HOST_RAM_MB_PARAM_OFFSET = 6;
const HOST_DISK_MB_PARAM_OFFSET = 10;
const HOST_TOT_INS_COUNT_PARAM_OFFSET = 14;
const HOST_CPU_MODEL_NAME_PARAM_OFFSET = 18;
const HOST_CPU_COUNT_PARAM_OFFSET = 58;
const HOST_CPU_SPEED_PARAM_OFFSET = 60;
const HOST_DESCRIPTION_PARAM_OFFSET = 62;
const HOST_EMAIL_ADDRESS_PARAM_OFFSET = 88;
const HOST_LEASE_AMOUNT_PARAM_OFFSET = 128;
const HOST_REG_PARAM_SIZE = 136;

const HOST_UPDATE_TOKEN_ID_PARAM_OFFSET = 0;
const HOST_UPDATE_COUNTRY_CODE_PARAM_OFFSET = 32;
const HOST_UPDATE_CPU_MICROSEC_PARAM_OFFSET = 34;
const HOST_UPDATE_RAM_MB_PARAM_OFFSET = 38;
const HOST_UPDATE_DISK_MB_PARAM_OFFSET = 42;
const HOST_UPDATE_TOT_INS_COUNT_PARAM_OFFSET = 46;
const HOST_UPDATE_ACT_INS_COUNT_PARAM_OFFSET = 50;
const HOST_UPDATE_DESCRIPTION_PARAM_OFFSET = 54;
const HOST_UPDATE_VERSION_PARAM_OFFSET = 80;
const HOST_UPDATE_EMAIL_ADDRESS_PARAM_OFFSET = 83;
const HOST_UPDATE_LEASE_AMOUNT_PARAM_OFFSET = 123;
const HOST_UPDATE_PARAM_SIZE = 131;

const VOTE_VALIDATION_ERR = "VOTE_VALIDATION_ERR";

const IPV6_FAMILY = 6;

const MAX_HOST_LEDGER_OFFSET = 30;
const TX_RETRY_INTERVAL = 10000;

class HostClient extends BaseEvernodeClient {

    constructor(xrpAddress, xrpSecret, options = {}) {
        super(xrpAddress, xrpSecret, Object.values(HostEvents), true, options);
    }

    async connect() {
        await this.connect();
        await this.setReputationAcc();
    }

    async setReputationAcc(reputationAddress = null, reputationSecret = null) {
        let validate = true;
        if (!reputationAddress && !reputationSecret) {
            const messageKey = await this.xrplAcc.getMessageKey();
            if (messageKey && this.accKeyPair.publicKey !== messageKey) {
                reputationAddress = UtilHelpers.deriveAddress(messageKey);
                validate = false;
            }
        }

        if (reputationAddress || reputationSecret) {
            this.reputationAcc = new XrplAccount(reputationAddress, reputationSecret, { xrplApi: this.xrplApi });

            if (validate && this.reputationAcc.address !== UtilHelpers.deriveAddress(await this.xrplAcc.getMessageKey()))
                throw 'Reputation address mismatch with configured.';
        }
    }

    /**
     * Get max ledger sequence for host client.
     * @returns Max ledger sequence number.
     */
    #getMaxLedgerSequence() {
        return (this.xrplApi.ledgerIndex + MAX_HOST_LEDGER_OFFSET);
    }

    /**
     * Get registration URI token info.
     * @returns The registration URI token object.
     */
    async getRegistrationUriToken() {
        // Find an owned NFT with matching Evernode host NFT prefix.
        const uriToken = (await this.xrplAcc.getURITokens()).find(n => n.URI.startsWith(EvernodeConstants.TOKEN_PREFIX_HEX) && n.Issuer === this.config.registryAddress);
        return uriToken ?? null;
    }

    /**
     * Get host info if registered.
     * @returns Host info object if registered, Otherwise null.
     */
    async getRegistration() {
        // Check whether we own an evernode host token.
        const regUriToken = await this.getRegistrationUriToken();
        if (regUriToken) {
            const host = await this.getHostInfo();
            return (host?.uriTokenId == regUriToken.index) ? host : null;
        }

        return null;
    }

    /**
     * Get offered and unoffered leases created by the host.
     * @returns Array of lease offer objects.
     */
    async getLeases() {
        return await EvernodeHelpers.getLeases(this.xrplAcc);
    }

    /**
     * Get lease offers created by the host.
     * @returns Array of lease offer objects.
     */
    async getLeaseOffers() {
        return await EvernodeHelpers.getLeaseOffers(this.xrplAcc);
    }

    /**
     * Get unoffered leases created by the host.
     * @returns Array of lease objects.
     */
    async getUnofferedLeases() {
        return await EvernodeHelpers.getUnofferedLeases(this.xrplAcc);
    }

    /**
     * Check wether the host is registered.
     * @returns Boolean if the host is registered or not.
     */
    async isRegistered() {
        return (await this.getRegistration()) !== null;
    }

    async #submitWithRetry(callback, options = {}) {
        let attempt = 0;
        let feeUplift = 0;
        const maxAttempts = (options?.maxRetryAttempts || 10);
        let submissionRef = options.submissionRef || {};
        while (attempt <= maxAttempts) {
            attempt++;
            try {
                return await callback(feeUplift, submissionRef);
            }
            catch (e) {
                if (attempt == maxAttempts || e.code === "tecDUPLICATE" || e.code === "tefPAST_SEQ" || e.code === "tefALREADY")
                    throw e;
                else if (e.status === "TOOK_LONG") {
                    feeUplift += (options?.feeUplift || 0);
                }
                console.error(e);
                console.error(`Submission attempt ${attempt} failed. Retrying...`);
                await new Promise(resolve => setTimeout(resolve, TX_RETRY_INTERVAL));

                // Check again wether the transaction is validated before retry.
                const txHash = submissionRef?.submissionResult?.result?.tx_json?.hash;
                if (txHash) {
                    const txResponse = await this.xrplApi.getTransactionValidatedResults(txHash);
                    if (txResponse && txResponse.code === "tesSUCCESS") {
                        console.log('Transaction is validated and success, Retry skipped!')
                        return txResponse;
                    }
                }
            }
        }
    }

    /**
     * Prepare the host account with account fields and trust lines.
     * @param {string} domain Domain which the host machine is reachable.
     */
    async prepareAccount(domain, options = {}) {
        const [flags, trustLines, msgKey, curDomain] = await Promise.all([
            this.xrplAcc.getFlags(),
            this.xrplAcc.getTrustLines(EvernodeConstants.EVR, this.config.evrIssuerAddress),
            this.xrplAcc.getMessageKey(),
            this.xrplAcc.getDomain()]);

        let accountSetFields = {};
        accountSetFields = (flags.lsfDefaultRipple) ? { ...accountSetFields, Flags: { asfDefaultRipple: false } } : accountSetFields;
        accountSetFields = (!msgKey) ? { ...accountSetFields, MessageKey: this.accKeyPair.publicKey } : accountSetFields;

        domain = domain.toLowerCase();
        accountSetFields = (!curDomain || curDomain !== domain) ?
            { ...accountSetFields, Domain: domain } : accountSetFields;

        if (Object.keys(accountSetFields).length !== 0) {
            await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                await this.xrplAcc.setAccountFields(accountSetFields, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
            }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        }

        if (trustLines.length === 0) {
            await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                await this.xrplAcc.setTrustLine(EvernodeConstants.EVR, this.config.evrIssuerAddress, "99999999999999", null, null, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
            }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        }
    }

    /**
     * Prepare the reputation account with account fields and trust lines.
     * @param {string} reputationSecret Secret of the reputation account.
     */
    async prepareReputationAccount(reputationSecret, options = {}) {
        const repAcc = new XrplAccount(null, reputationSecret, { xrplApi: this.xrplApi });
        const [trustLines, msgKey, hostAccMsgKey] = await Promise.all([
            repAcc.getTrustLines(EvernodeConstants.EVR, this.config.evrIssuerAddress),
            repAcc.getMessageKey(),
            this.xrplAcc.getMessageKey()]);

        const repKeyPair = repAcc.deriveKeypair();

        let accountSetFields = {};
        accountSetFields = (!msgKey || msgKey != this.accKeyPair.publicKey) ? { ...accountSetFields, MessageKey: this.accKeyPair.publicKey } : accountSetFields;

        if (Object.keys(accountSetFields).length !== 0) {
            await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                await repAcc.setAccountFields(accountSetFields, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
            }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        }

        if (trustLines.length === 0) {
            await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                await repAcc.setTrustLine(EvernodeConstants.EVR, this.config.evrIssuerAddress, "99999999999999", null, null, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
            }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        }

        let hostAccountSetFields = {};
        hostAccountSetFields = (!hostAccMsgKey || hostAccMsgKey != repKeyPair.publicKey) ? { ...hostAccountSetFields, MessageKey: repKeyPair.publicKey } : hostAccountSetFields;

        if (Object.keys(hostAccountSetFields).length !== 0) {
            await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                await this.xrplAcc.setAccountFields(accountSetFields, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
            }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        }

        await this.setReputationAcc(UtilHelpers.deriveAddress(repKeyPair.publicKey), reputationSecret);
    }

    /**
     * Set the reputation contract info.
     * @param {number} port Port of the reputation contract instance.
     * @param {string} publicKey Public key of the reputation contract instance.
     */
    async setReputationContractInfo(port, publicKey, options = {}) {
        var buffer = Buffer.alloc(ReputationConstants.REP_INFO_BUFFER_SIZE, 0);
        Buffer.from(publicKey.toUpperCase(), "hex").copy(buffer, ReputationConstants.REP_INFO_PUBKEY_OFFSET);
        buffer.writeUInt16LE(port, ReputationConstants.REP_INFO_PORT_OFFSET);

        let accountSetFields = {};
        accountSetFields = { ...accountSetFields, Domain: buffer.toString('hex') };

        if (Object.keys(accountSetFields).length !== 0) {
            await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                await this.reputationAcc.setAccountFields(accountSetFields, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
            }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        }
    }

    /**
     * Get reputation info of this host.
     */
    async getReputationInfo() {
        if (!this.reputationAcc)
            return null;

        return await this._getReputationInfoByAddress(this.reputationAcc.address);
    }

    /**
     * Send reputation scores to the reputation hook.
     * @param {object} scores [Optional] Score object in { host: score } format.
     */
    async sendReputations(scores = null, options = {}) {
        let buffer = Buffer.alloc(64, 0);
        if (scores) {
            let i = 0;
            for (const [key, value] of Object.entries(scores)) {
                buffer.writeUIntLE(Number(value), i);
                i++;
            }
        }

        await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            await this.reputationAcc.invoke(this.config.reputationAddress,
                XrplConstants.MIN_DROPS,
                scores ? { isHex: true, data: buffer.toString('hex') } : null,
                {
                    maxLedgerIndex: this.#getMaxLedgerSequence(),
                    feeUplift: feeUplift, submissionRef: submissionRef,
                    ...options.transactionOptions
                });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
    }

    /**
     * Create a lease offer.
     * @param {number} leaseIndex Index number for the lease.
     * @param {number} leaseAmount Amount (EVRs) of the lease offer.
     * @param {string} tosHash Hex hash of the Terms Of Service text.
     * @param {string} outboundIPAddress Assigned IP Address.
     */
    async offerLease(leaseIndex, leaseAmount, tosHash, outboundIPAddress = null, options = {}) {

        // <prefix><version tag ("LTV"+uint8)><lease index (uint16)><half of tos hash><lease amount (int64)><identifier (uint32)><ip data>
        // Lengths of sub sections.
        const prefixLen = EvernodeConstants.LEASE_TOKEN_PREFIX_HEX.length / 2;
        const versionPrefixLen = EvernodeConstants.LEASE_TOKEN_VERSION_PREFIX_HEX.length / 2;
        const versionLen = versionPrefixLen + 2; // ("LTV"<Version Number>)
        const indexLen = 2;
        const halfToSLen = tosHash.length / 4;
        const leaseAmountLen = 8;
        const identifierLen = 4;
        const ipDataLen = 17;

        // Offsets of sub sections
        const versionPrefixOffset = prefixLen;
        const versionOffset = prefixLen + versionPrefixLen;
        const indexOffset = prefixLen + versionLen;
        const halfTosHashOffset = prefixLen + versionLen + indexLen;
        const leaseAmountOffset = prefixLen + versionLen + indexLen + halfToSLen;
        const identifierOffset = prefixLen + versionLen + indexLen + halfToSLen + leaseAmountLen;
        const ipDataOffset = prefixLen + versionLen + indexLen + halfToSLen + leaseAmountLen + identifierLen;

        const uriBuf = Buffer.alloc((prefixLen + versionLen + indexLen + halfToSLen + leaseAmountLen + identifierLen + ipDataLen));

        Buffer.from(EvernodeConstants.LEASE_TOKEN_PREFIX_HEX, 'hex').copy(uriBuf);
        Buffer.from(EvernodeConstants.LEASE_TOKEN_VERSION_PREFIX_HEX, 'hex').copy(uriBuf, versionPrefixOffset, 0, versionPrefixLen);
        uriBuf.writeUInt16BE(EvernodeConstants.LEASE_TOKEN_VERSION, versionOffset);
        uriBuf.writeUInt16BE(leaseIndex, indexOffset);
        Buffer.from(tosHash, 'hex').copy(uriBuf, halfTosHashOffset, 0, halfToSLen);
        uriBuf.writeBigInt64BE(XflHelpers.getXfl(leaseAmount.toString()), leaseAmountOffset);
        uriBuf.writeUInt32BE((await this.xrplAcc.getSequence()), identifierOffset);

        if (outboundIPAddress) {
            if (outboundIPAddress.includes(":")) {
                uriBuf.writeUInt8(IPV6_FAMILY, ipDataOffset);
                const ipBuf = Buffer.from(outboundIPAddress.split(':').map(v => {
                    const bytes = [];
                    for (let i = 0; i < v.length; i += 2) {
                        bytes.push(parseInt(v.substr(i, 2), 16));
                    }
                    return bytes;
                }).flat());

                ipBuf.copy(uriBuf, ipDataOffset + 1, 0, ipDataLen);
            } else {
                throw "Invalid outbound IP address was provided";
            }
        }

        const uri = uriBuf.toString('base64');

        try {
            await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                await this.xrplAcc.mintURIToken(uri, null, { isBurnable: true, isHexUri: false }, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
            }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        } catch (e) {
            // Re-minting the URIToken after burning that sold URIToken.
            if (e.code === "tecDUPLICATE") {
                const uriTokenId = this.xrplAcc.generateIssuedURITokenId(uri);
                console.log(`Burning URIToken related to a previously sold lease.`);
                await this.xrplAcc.burnURIToken(uriTokenId, { maxLedgerIndex: this.#getMaxLedgerSequence() });
                console.log("Re-mint the URIToken for the new lease offer.")
                await this.xrplAcc.mintURIToken(uri, null, { isBurnable: true, isHexUri: false }, { maxLedgerIndex: this.#getMaxLedgerSequence() });
            }
        }

        const uriToken = await this.xrplAcc.getURITokenByUri(uri);
        if (!uriToken)
            throw "Offer lease NFT creation error.";

        await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            await this.xrplAcc.sellURIToken(uriToken.index,
                leaseAmount.toString(),
                EvernodeConstants.EVR,
                this.config.evrIssuerAddress, null, null, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
    }

    /**
     * Mint a lease offer.
     * @param {number} leaseIndex Index number for the lease.
     * @param {number} leaseAmount Amount (EVRs) of the lease offer.
     * @param {string} tosHash Hex hash of the Terms Of Service text.
     * @param {string} outboundIPAddress Assigned IP Address.
     */
    async mintLease(leaseIndex, leaseAmount, tosHash, outboundIPAddress = null, options = {}) {

        // <prefix><version tag ("LTV"+uint8)><lease index (uint16)><half of tos hash><lease amount (int64)><identifier (uint32)><ip data>
        // Lengths of sub sections.
        const prefixLen = EvernodeConstants.LEASE_TOKEN_PREFIX_HEX.length / 2;
        const versionPrefixLen = EvernodeConstants.LEASE_TOKEN_VERSION_PREFIX_HEX.length / 2;
        const versionLen = versionPrefixLen + 2; // ("LTV"<Version Number>)
        const indexLen = 2;
        const halfToSLen = tosHash.length / 4;
        const leaseAmountLen = 8;
        const identifierLen = 4;
        const ipDataLen = 17;

        // Offsets of sub sections
        const versionPrefixOffset = prefixLen;
        const versionOffset = prefixLen + versionPrefixLen;
        const indexOffset = prefixLen + versionLen;
        const halfTosHashOffset = prefixLen + versionLen + indexLen;
        const leaseAmountOffset = prefixLen + versionLen + indexLen + halfToSLen;
        const identifierOffset = prefixLen + versionLen + indexLen + halfToSLen + leaseAmountLen;
        const ipDataOffset = prefixLen + versionLen + indexLen + halfToSLen + leaseAmountLen + identifierLen;

        const uriBuf = Buffer.alloc((prefixLen + versionLen + indexLen + halfToSLen + leaseAmountLen + identifierLen + ipDataLen));

        Buffer.from(EvernodeConstants.LEASE_TOKEN_PREFIX_HEX, 'hex').copy(uriBuf);
        Buffer.from(EvernodeConstants.LEASE_TOKEN_VERSION_PREFIX_HEX, 'hex').copy(uriBuf, versionPrefixOffset, 0, versionPrefixLen);
        uriBuf.writeUInt16BE(EvernodeConstants.LEASE_TOKEN_VERSION, versionOffset);
        uriBuf.writeUInt16BE(leaseIndex, indexOffset);
        Buffer.from(tosHash, 'hex').copy(uriBuf, halfTosHashOffset, 0, halfToSLen);
        uriBuf.writeBigInt64BE(XflHelpers.getXfl(leaseAmount.toString()), leaseAmountOffset);
        uriBuf.writeUInt32BE((await this.xrplAcc.getSequence()), identifierOffset);

        if (outboundIPAddress) {
            if (outboundIPAddress.includes(":")) {
                uriBuf.writeUInt8(IPV6_FAMILY, ipDataOffset);
                const ipBuf = Buffer.from(outboundIPAddress.split(':').map(v => {
                    const bytes = [];
                    for (let i = 0; i < v.length; i += 2) {
                        bytes.push(parseInt(v.substr(i, 2), 16));
                    }
                    return bytes;
                }).flat());

                ipBuf.copy(uriBuf, ipDataOffset + 1, 0, ipDataLen);
            } else {
                throw "Invalid outbound IP address was provided";
            }
        }

        const uri = uriBuf.toString('base64');

        try {
            await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                await this.xrplAcc.mintURIToken(uri, null, { isBurnable: true, isHexUri: false }, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
            }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        } catch (e) {
            // Re-minting the URIToken after burning that sold URIToken.
            if (e.code === "tecDUPLICATE") {
                const uriTokenId = this.xrplAcc.generateIssuedURITokenId(uri);
                console.log(`Burning URIToken related to a previously sold lease.`);
                await this.xrplAcc.burnURIToken(uriTokenId, { maxLedgerIndex: this.#getMaxLedgerSequence() });
                console.log("Re-mint the URIToken for the new lease offer.")
                await this.xrplAcc.mintURIToken(uri, null, { isBurnable: true, isHexUri: false }, { maxLedgerIndex: this.#getMaxLedgerSequence() });
            }
        }
    }

    /**
     * Create a lease offer.
     * @param {number} uriTokenId Id of the token.
     * @param {number} leaseAmount Amount (EVRs) of the lease offer.
     */
    async offerMintedLease(uriTokenId, leaseAmount, options = {}) {
        await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            await this.xrplAcc.sellURIToken(uriTokenId, leaseAmount.toString(),
                EvernodeConstants.EVR,
                this.config.evrIssuerAddress, null, null, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
    }

    /**
     * Expire the lease offer.
     * @param {string} uriTokenId Hex URI token id of the lease.
     */
    async expireLease(uriTokenId, options = {}) {
        await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            await this.xrplAcc.burnURIToken(uriTokenId, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
    }

    /**
     * Accepts if there's an available reg token.
     * @param {*} options [Optional] transaction options.
     * @returns True if there were reg token and it's accepted, Otherwise false.
     */
    async acceptRegToken(options = {}) {
        // Check whether is there any missed NFT sell offer that needs to be accepted
        // from the client-side in order to complete the registration.
        const registryAcc = new XrplAccount(this.config.registryAddress, null, { xrplApi: this.xrplApi });
        const regUriToken = await this.getRegistrationUriToken();

        if (!regUriToken) {
            const regInfo = await this.getHostInfo(this.xrplAcc.address);
            if (regInfo) {
                const sellOffer = (await registryAcc.getURITokens()).find(o => o.index == regInfo.uriTokenId && o.Amount);
                console.log('Pending sell offer found.')
                if (sellOffer) {
                    await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                        await this.xrplAcc.buyURIToken(sellOffer, null, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
                    }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
                    console.log("Registration was successfully completed after acquiring the NFT.");
                    return await this.isRegistered();
                }
            }
        }

        return false;
    }

    /**
     * Register the host in the Evernode network.
     * @param {string} countryCode Upper case country code with two letters.
     * @param {number} cpuMicroSec CPU cycle in micro seconds of the host.
     * @param {number} ramMb Ram size in mega bytes.
     * @param {number} diskMb Disk size in mega bytes.
     * @param {number} totalInstanceCount Total number of instance slots in the host.
     * @param {string} cpuModel Model of the host CPU.
     * @param {number} cpuCount Number of CPUs in the host.
     * @param {number} cpuSpeed CPU MHz.
     * @param {string} description Description about the host.
     * @param {string} emailAddress Email address of the host.
     * @param {number} leaseAmount Lease fee of the host.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async register(countryCode, cpuMicroSec, ramMb, diskMb, totalInstanceCount, cpuModel, cpuCount, cpuSpeed, description, emailAddress, leaseAmount, options = {}) {
        if (!/^([A-Z]{2})$/.test(countryCode))
            throw "countryCode should consist of 2 uppercase alphabetical characters";
        else if (!cpuMicroSec || isNaN(cpuMicroSec) || cpuMicroSec % 1 != 0 || cpuMicroSec < 0)
            throw "cpuMicroSec should be a positive integer";
        else if (!ramMb || isNaN(ramMb) || ramMb % 1 != 0 || ramMb < 0)
            throw "ramMb should be a positive integer";
        else if (!diskMb || isNaN(diskMb) || diskMb % 1 != 0 || diskMb < 0)
            throw "diskMb should be a positive integer";
        else if (!totalInstanceCount || isNaN(totalInstanceCount) || totalInstanceCount % 1 != 0 || totalInstanceCount < 0)
            throw "totalInstanceCount should be a positive integer";
        else if (!cpuCount || isNaN(cpuCount) || cpuCount % 1 != 0 || cpuCount < 0)
            throw "CPU count should be a positive integer";
        else if (!cpuSpeed || isNaN(cpuSpeed) || cpuSpeed % 1 != 0 || cpuSpeed < 0)
            throw "CPU speed should be a positive integer";
        else if (!cpuModel)
            throw "cpu model cannot be empty";
        else if (!leaseAmount || isNaN(leaseAmount) || diskMb < 0)
            throw "leaseAmount should be a positive float";

        // Need to use control characters inside this regex to match ascii characters.
        // Here we allow all the characters in ascii range except ";" for the description.
        // no-control-regex is enabled default by eslint:recommended, So we disable it only for next line.
        // eslint-disable-next-line no-control-regex
        else if (!/^((?![;])[\x00-\x7F]){0,26}$/.test(description))
            throw "description should consist of 0-26 ascii characters except ';'";

        else if (!emailAddress || !(/.+@.+/.test(emailAddress)) || (emailAddress.length > 40))
            throw "Email address should be valid and can not have more than 40 characters.";

        if (await this.isRegistered())
            throw "Host already registered.";

        // Check whether are there lease offers in for the host due to a previous registration.
        const existingLeaseURITokens = (await this.xrplAcc.getURITokens()).filter(n => n.Issuer == this.xrplAcc.address && EvernodeHelpers.isValidURI(n.URI, EvernodeConstants.LEASE_TOKEN_PREFIX_HEX));
        if (existingLeaseURITokens) {
            console.log("Burning unsold URITokens related to the previous leases.");
            for (const uriToken of existingLeaseURITokens) {
                await this.#submitWithRetry(async (feeUplift, submissionRef) => {
                    await this.xrplAcc.burnURIToken(uriToken.index, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
                }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
            }
        }

        if (await this.acceptRegToken())
            return true;

        // Check the availability of an initiated transfer.
        // Need to modify the amount accordingly.
        const stateTransfereeAddrKey = StateHelpers.generateTransfereeAddrStateKey(this.xrplAcc.address);
        const stateTransfereeAddrIndex = StateHelpers.getHookStateIndex(this.governorAddress, stateTransfereeAddrKey);
        let transfereeAddrLedgerEntry = {};
        let transfereeAddrStateData = {};
        let transferredNFTokenId = null;

        try {
            const res = await this.xrplApi.getLedgerEntry(stateTransfereeAddrIndex);
            transfereeAddrLedgerEntry = { ...transfereeAddrLedgerEntry, ...res };
            transfereeAddrStateData = transfereeAddrLedgerEntry?.HookStateData;
            const transfereeAddrStateDecoded = StateHelpers.decodeTransfereeAddrState(Buffer.from(stateTransfereeAddrKey, 'hex'), Buffer.from(transfereeAddrStateData, 'hex'));
            transferredNFTokenId = transfereeAddrStateDecoded?.transferredNfTokenId;

        }
        catch (e) {
            console.log("No initiated transfers were found.");
        }

        // <country_code(2)><cpu_microsec(4)><ram_mb(4)><disk_mb(4)><no_of_total_instances(4)><cpu_model(40)><cpu_count(2)><cpu_speed(2)><description(26)><email_address(40)><host_lease_amount(8,xfl)>
        const paramBuf = Buffer.alloc(HOST_REG_PARAM_SIZE, 0);
        Buffer.from(countryCode.substr(0, 2), "utf-8").copy(paramBuf, HOST_COUNTRY_CODE_PARAM_OFFSET);
        paramBuf.writeUInt32LE(cpuMicroSec, HOST_CPU_MICROSEC_PARAM_OFFSET);
        paramBuf.writeUInt32LE(ramMb, HOST_RAM_MB_PARAM_OFFSET);
        paramBuf.writeUInt32LE(diskMb, HOST_DISK_MB_PARAM_OFFSET);
        paramBuf.writeUInt32LE(totalInstanceCount, HOST_TOT_INS_COUNT_PARAM_OFFSET);
        Buffer.from(cpuModel.substr(0, 40), "utf-8").copy(paramBuf, HOST_CPU_MODEL_NAME_PARAM_OFFSET);
        paramBuf.writeUInt16LE(cpuCount, HOST_CPU_COUNT_PARAM_OFFSET);
        paramBuf.writeUInt16LE(cpuSpeed, HOST_CPU_SPEED_PARAM_OFFSET);
        Buffer.from(description.substr(0, 26), "utf-8").copy(paramBuf, HOST_DESCRIPTION_PARAM_OFFSET);
        Buffer.from(emailAddress.substr(0, 40), "utf-8").copy(paramBuf, HOST_EMAIL_ADDRESS_PARAM_OFFSET);
        paramBuf.writeBigInt64LE(XflHelpers.getXfl(leaseAmount.toString()), HOST_LEASE_AMOUNT_PARAM_OFFSET);

        const tx = await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            return await this.xrplAcc.makePayment(this.config.registryAddress,
                (transferredNFTokenId) ? EvernodeConstants.NOW_IN_EVRS : this.config.hostRegFee.toString(),
                EvernodeConstants.EVR,
                this.config.evrIssuerAddress,
                null,
                {
                    hookParams: [
                        { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.HOST_REG },
                        { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: paramBuf.toString('hex').toUpperCase() }
                    ],
                    maxLedgerIndex: this.#getMaxLedgerSequence(),
                    feeUplift: feeUplift, submissionRef: submissionRef,
                    ...options.transactionOptions
                });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });

        console.log('Waiting for the sell offer', tx.id)
        const registryAcc = new XrplAccount(this.config.registryAddress, null, { xrplApi: this.xrplApi });
        let sellOffer = null;
        let attempts = 0;
        let offerLedgerIndex = 0;
        const firstPart = tx.id.substring(0, 8);
        const lastPart = tx.id.substring(tx.id.length - 8);
        const trxRef = TransactionHelper.asciiToHex(firstPart + lastPart);
        while (attempts < OFFER_WAIT_TIMEOUT) {
            sellOffer = (await registryAcc.getURITokens()).find(n => (
                n.Amount &&
                n.Destination === this.xrplAcc.address &&
                (!transferredNFTokenId ?
                    (n.URI === `${EvernodeConstants.TOKEN_PREFIX_HEX}${trxRef}`) :
                    (n.index === transferredNFTokenId))));

            offerLedgerIndex = this.xrplApi.ledgerIndex;
            if (sellOffer)
                break;
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        if (!sellOffer)
            throw 'No sell offer found within timeout.';

        console.log('Accepting the sell offer..');

        // Wait until the next ledger after the offer is created.
        // Otherwise if the offer accepted in the same legder which it's been created,
        // We cannot fetch the offer from registry contract event handler since it's getting deleted immediately.
        await new Promise(async resolve => {
            while (this.xrplApi.ledgerIndex <= offerLedgerIndex)
                await new Promise(resolve2 => setTimeout(resolve2, 1000));
            resolve();
        });

        await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            await this.xrplAcc.buyURIToken(sellOffer, null, { maxLedgerIndex: this.#getMaxLedgerSequence(), feeUplift: feeUplift, submissionRef: submissionRef });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });
        return await this.isRegistered();
    }

    /**
     * Deregister a host from the Evernode network.
     * @param {string} error [Optional] Error.
     * @param {*} options [Optional] transaction options.
     * @returns Boolean whether host is registered or not.
     */
    async deregister(error = null, options = {}) {

        if (!(await this.isRegistered()))
            throw "Host not registered."

        const regUriToken = await this.getRegistrationUriToken();
        const paramBuf = Buffer.alloc(33, 0);
        Buffer.from(regUriToken.index, "hex").copy(paramBuf, 0);
        if (error) {
            // <token_id(32)><error(1)>
            paramBuf.writeUInt8(1, 32);
        }

        await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            await this.xrplAcc.makePayment(this.config.registryAddress,
                XrplConstants.MIN_DROPS,
                null,
                null,
                null,
                {
                    hookParams: [
                        { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.HOST_DEREG },
                        { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: paramBuf.toString('hex').toUpperCase() }
                    ],
                    maxLedgerIndex: this.#getMaxLedgerSequence(),
                    feeUplift: feeUplift, submissionRef: submissionRef,
                    ...options.transactionOptions
                });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });

        return await this.isRegistered();
    }

    /**
     * Update the host registration in the Evernode network.
     * @param {number} activeInstanceCount Currently active instance count in the host.
     * @param {string} version Sashimono version installed on the host
     * @param {number} totalInstanceCount Total number of instance slots in the host.
     * @param {string} tokenID Registration Token Id of the host.
     * @param {string} countryCode Upper case country code with two letters.
     * @param {number} cpuMicroSec 
     * @param {number} ramMb Ram size in mega bytes.
     * @param {number} diskMb Disk size in mega bytes.
     * @param {string} description Description about the host.
     * @param {string} emailAddress Email address of the host.
     * @param {number} leaseAmount Lease fee of the host.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async updateRegInfo(activeInstanceCount = null, version = null, totalInstanceCount = null, tokenID = null, countryCode = null, cpuMicroSec = null, ramMb = null, diskMb = null, description = null, emailAddress = null, leaseAmount = null, options = {}) {
        // <token_id(32)><country_code(2)><cpu_microsec(4)><ram_mb(4)><disk_mb(4)><total_instance_count(4)><active_instances(4)><description(26)><version(3)><email(40)>
        const paramBuf = Buffer.alloc(HOST_UPDATE_PARAM_SIZE, 0);
        if (tokenID)
            Buffer.from(tokenID.substr(0, 32), "hex").copy(paramBuf, HOST_UPDATE_TOKEN_ID_PARAM_OFFSET);
        if (countryCode)
            Buffer.from(countryCode.substr(0, 2), "utf-8").copy(paramBuf, HOST_UPDATE_COUNTRY_CODE_PARAM_OFFSET);
        if (cpuMicroSec)
            paramBuf.writeUInt32LE(cpuMicroSec, HOST_UPDATE_CPU_MICROSEC_PARAM_OFFSET);
        if (ramMb)
            paramBuf.writeUInt32LE(ramMb, HOST_UPDATE_RAM_MB_PARAM_OFFSET);
        if (diskMb)
            paramBuf.writeUInt32LE(diskMb, HOST_UPDATE_DISK_MB_PARAM_OFFSET);
        if (totalInstanceCount)
            paramBuf.writeUInt32LE(totalInstanceCount, HOST_UPDATE_TOT_INS_COUNT_PARAM_OFFSET);
        if (activeInstanceCount)
            paramBuf.writeUInt32LE(activeInstanceCount, HOST_UPDATE_ACT_INS_COUNT_PARAM_OFFSET);
        if (description)
            Buffer.from(description.substr(0, 26), "utf-8").copy(paramBuf, HOST_UPDATE_DESCRIPTION_PARAM_OFFSET);
        if (emailAddress)
            Buffer.from(emailAddress.substr(0, 40), "utf-8").copy(paramBuf, HOST_UPDATE_EMAIL_ADDRESS_PARAM_OFFSET);
        if (version) {
            const components = version.split('.').map(v => parseInt(v));
            if (components.length != 3)
                throw 'Invalid version format.';
            paramBuf.writeUInt8(components[0], HOST_UPDATE_VERSION_PARAM_OFFSET);
            paramBuf.writeUInt8(components[1], HOST_UPDATE_VERSION_PARAM_OFFSET + 1);
            paramBuf.writeUInt8(components[2], HOST_UPDATE_VERSION_PARAM_OFFSET + 2);
        }
        if (leaseAmount)
            paramBuf.writeBigInt64LE(XflHelpers.getXfl(leaseAmount.toString()), HOST_UPDATE_LEASE_AMOUNT_PARAM_OFFSET);

        return await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            return await this.xrplAcc.makePayment(this.config.registryAddress,
                XrplConstants.MIN_DROPS,
                null,
                null,
                null,
                {
                    hookParams: [
                        { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.HOST_UPDATE_INFO },
                        { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: paramBuf.toString('hex') }
                    ],
                    maxLedgerIndex: this.#getMaxLedgerSequence(),
                    feeUplift: feeUplift, submissionRef: submissionRef,
                    ...options.transactionOptions
                });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });

    }

    /**
     * Send a heartbeat from the host.
     * @param {*} voteInfo [Optional] Candidate votes if there's any `{ '<candidateId>': '{number 0|1} vote', ... }`
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async heartbeat(voteInfo = {}, options = {}) {
        let unofferedLeases = await this.getUnofferedLeases();
        if (unofferedLeases.length > 0) {
            console.log("Unoffered leases detected. Heartbeat was not sent.");
            return;
        }

        let data;
        // Prepare voteInfo
        if (Object.keys(voteInfo).length > 1) {
            let voteBuf = Buffer.alloc(33);
            Buffer.from(voteInfo.candidate, 'hex').copy(voteBuf, 0);
            voteBuf.writeUInt8(voteInfo.vote, 32);
            data = voteBuf.toString('hex').toUpperCase();
        }

        try {
            const res = await this.xrplAcc.makePayment(this.config.heartbeatAddress,
                XrplConstants.MIN_DROPS,
                null,
                null,
                null,
                {
                    hookParams: [
                        { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.HEARTBEAT },
                        ...(data ? [{ name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: data }] : [])
                    ],
                    maxLedgerIndex: this.#getMaxLedgerSequence(),
                    ...options.transactionOptions,
                    submissionRef: options.submissionRef
                });
            return res;
        }
        catch (e) {
            const validationErr = e?.hookExecutionResult?.find(r => r.message.includes(VOTE_VALIDATION_ERR));
            if (validationErr) {
                console.log('Vote validation error occurred.')
                throw {
                    code: VOTE_VALIDATION_ERR,
                    error: validationErr.message
                }
            }
            throw e;
        }
    }

    /**
     * Send acquire success response to the tenant.
     * @param {string} txHash Acquire lease transaction hash in hex.
     * @param {string} tenantAddress XRPL address of the tenant.
     * @param {string} instanceInfo Created instance info.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async acquireSuccess(txHash, tenantAddress, instanceInfo, options = {}) {

        // Encrypt the instance info with the tenant's encryption key (Specified in MessageKey field of the tenant account).
        const tenantAcc = new XrplAccount(tenantAddress, null, { xrplApi: this.xrplApi });

        let encKey = null;
        let doEncrypt = true;
        // Initialize with not-encrypted prefix flag and the data.
        let data = Buffer.concat([Buffer.from([0x00]), Buffer.from(JSON.stringify(instanceInfo))]).toString('base64');

        if ('messageKey' in options) {
            if (options.messageKey !== 'none' && RegExp.PublicPrivateKey.test(options.messageKey)) {
                encKey = options.messageKey;
            } else if (options.messageKey === 'none') {
                doEncrypt = false;
            } else
                throw "Tenant encryption key not valid.";
        } else {
            encKey = await tenantAcc.getMessageKey();
        }

        if (doEncrypt) {
            if (!encKey)
                throw "Tenant encryption key not set.";
            const encrypted = await EncryptionHelper.encrypt(encKey, instanceInfo);
            // Override encrypted prefix flag and the data.
            data = Buffer.concat([Buffer.from([0x01]), Buffer.from(encrypted, 'base64')]).toString('base64');
        }

        return this.xrplAcc.makePayment(tenantAddress,
            XrplConstants.MIN_DROPS,
            null,
            null,
            [
                { type: EventTypes.ACQUIRE_SUCCESS, format: MemoFormats.BASE64, data: data }
            ],
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.ACQUIRE_SUCCESS },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: txHash }
                ],
                maxLedgerIndex: this.#getMaxLedgerSequence(),
                ...options.transactionOptions,
                submissionRef: options.submissionRef
            });
    }

    /**
     * Send acquire error response to the tenant.
     * @param {string} txHash Acquire lease transaction hash in hex.
     * @param {string} tenantAddress Xrpl address of the tenant.
     * @param {number} leaseAmount Lease amount to be refunded.
     * @param {string} reason Reason for the error.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async acquireError(txHash, tenantAddress, leaseAmount, reason, options = {}) {

        return this.xrplAcc.makePayment(tenantAddress,
            leaseAmount.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [
                { type: EventTypes.ACQUIRE_ERROR, format: MemoFormats.JSON, data: { type: ErrorCodes.ACQUIRE_ERR, reason: reason } }
            ],
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.ACQUIRE_ERROR },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: txHash }
                ],
                maxLedgerIndex: this.#getMaxLedgerSequence(),
                ...options.transactionOptions,
                submissionRef: options.submissionRef
            });
    }

    /**
     * Send extend success response to the tenant.
     * @param {string} txHash Extend lease transaction hash in hex.
     * @param {string} tenantAddress XRPL address of the tenant.
     * @param {number} expiryMoment Moment which the instance will expire.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async extendSuccess(txHash, tenantAddress, expiryMoment, options = {}) {
        let buf = Buffer.alloc(4, 0);
        buf.writeUInt32BE(expiryMoment);

        return this.xrplAcc.makePayment(tenantAddress,
            XrplConstants.MIN_DROPS,
            null,
            null,
            [
                { type: EventTypes.EXTEND_SUCCESS, format: MemoFormats.HEX, data: buf.toString('hex') }
            ],
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.EXTEND_SUCCESS },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: txHash }
                ],
                maxLedgerIndex: this.#getMaxLedgerSequence(),
                ...options.transactionOptions,
                submissionRef: options.submissionRef
            });
    }

    /**
     * Send extend error response to the tenant.
     * @param {string} txHash Extend lease transaction hash in hex.
     * @param {string} tenantAddress Xrpl address of the tenant.
     * @param {string} reason Reason for the error.
     * @param {number} refund Amount to be refunded.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async extendError(txHash, tenantAddress, reason, refund, options = {}) {

        // Required to refund the paid EVR amount as the offer extention is not successfull.
        return this.xrplAcc.makePayment(tenantAddress,
            refund.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [
                { type: EventTypes.EXTEND_ERROR, format: MemoFormats.JSON, data: { type: ErrorCodes.EXTEND_ERR, reason: reason } }
            ],
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.EXTEND_ERROR },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: txHash }
                ],
                maxLedgerIndex: this.#getMaxLedgerSequence(),
                ...options.transactionOptions,
                submissionRef: options.submissionRef
            });
    }

    /**
     * Send refunds to the tenant.
     * @param {string} txHash Request transaction hash in hex.
     * @param {string} tenantAddress Xrpl address of the tenant.
     * @param {number} refundAmount Amount to be refunded.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async refundTenant(txHash, tenantAddress, refundAmount, options = {}) {
        return this.xrplAcc.makePayment(tenantAddress,
            refundAmount.toString(),
            EvernodeConstants.EVR,
            this.config.evrIssuerAddress,
            [
                { type: EventTypes.REFUND, format: '', data: '' }
            ],
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.REFUND },
                    { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: txHash }
                ],
                maxLedgerIndex: this.#getMaxLedgerSequence(),
                ...options.transactionOptions,
                submissionRef: options.submissionRef
            });
    }

    /**
     * Request registration rebates from the registry.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async requestRebate(options = {}) {
        return this.xrplAcc.makePayment(this.config.registryAddress,
            XrplConstants.MIN_DROPS,
            null,
            null,
            [
                { type: EventTypes.HOST_REBATE, format: "", data: "" }
            ],
            {
                hookParams: [
                    { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.HOST_REBATE }
                ],
                maxLedgerIndex: this.#getMaxLedgerSequence(),
                ...options.transactionOptions,
                submissionRef: options.submissionRef
            });
    }

    /**
     * Initiate a host transfer.
     * @param {string} transfereeAddress [Optional] Xrpl account address to host registration to be transferred.
     * @param {*} options [Optional] transaction options.
     */
    async transfer(transfereeAddress = this.xrplAcc.address, options = {}) {
        if (!(await this.isRegistered()))
            throw "Host is not registered.";

        const transfereeAcc = new XrplAccount(transfereeAddress, null, { xrplApi: this.xrplApi });

        if (this.xrplAcc.address !== transfereeAddress) {
            // Find the new transferee also owns an Evernode Host Registration token.
            const token = (await transfereeAcc.getURITokens()).find(n => n.URI.startsWith(EvernodeConstants.TOKEN_PREFIX_HEX) && n.Issuer === this.config.registryAddress);
            if (token)
                throw "The transferee is already registered in Evernode.";
        }

        const paramData = codec.decodeAccountID(transfereeAddress);

        const regUriToken = await this.getRegistrationUriToken();

        await this.#submitWithRetry(async (feeUplift, submissionRef) => {
            await this.xrplAcc.sellURIToken(regUriToken.index,
                XrplConstants.MIN_DROPS,
                null,
                null,
                this.config.registryAddress,
                null,
                {
                    hookParams: [
                        { name: HookParamKeys.PARAM_EVENT_TYPE_KEY, value: EventTypes.HOST_TRANSFER },
                        { name: HookParamKeys.PARAM_EVENT_DATA_KEY, value: paramData.toString('hex') }
                    ],
                    maxLedgerIndex: this.#getMaxLedgerSequence(),
                    feeUplift: feeUplift, submissionRef: submissionRef,
                    ...options.transactionOptions
                });
        }, { ...(options.retryOptions ? options.retryOptions : {}), submissionRef: options.submissionRef });

        let token = null;
        let attempts = 0;
        const regAcc = new XrplAccount(this.config.registryAddress, null, { xrplApi: this.xrplApi });

        while (attempts < OFFER_WAIT_TIMEOUT) {
            token = (await regAcc.getURITokens()).find(o => o.index == regUriToken.index);
            if (token)
                break;
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        if (!token)
            throw 'Token hasn\'t transferred within timeout.';
    }

    /**
     * Check whether this host is a transferee.
     * @returns Boolean wether the host is a transferee or not.
     */
    async isTransferee() {

        // Check the availability of TRANSFEREE state for this host address.
        const stateTransfereeAddrKey = StateHelpers.generateTransfereeAddrStateKey(this.xrplAcc.address);
        const stateTransfereeAddrIndex = StateHelpers.getHookStateIndex(this.governorAddress, stateTransfereeAddrKey);
        const res = await this.xrplApi.getLedgerEntry(stateTransfereeAddrIndex);

        if (res && res?.HookStateData)
            return true;

        return false;
    }

    /**
     * Propose a new hook candidate.
     * @param {string} hashes Hook candidate hashes in hex format, <GOVERNOR_HASH(32)><REGISTRY_HASH(32)><HEARTBEAT_HASH(32)>.
     * @param {string} shortName Short name for the proposal candidate.
     * @param {*} options [Optional] transaction options.
     * @returns Proposed candidate id.
     */
    async propose(hashes, shortName, options = {}) {
        if (!(await this.isRegistered()))
            throw 'Host should be registered to propose candidates.';

        options.transactionOptions = { maxLedgerIndex: this.#getMaxLedgerSequence(), ...(options.transactionOptions || {}) }
        return await super._propose(hashes, shortName, options);
    }

    /**
     * Withdraw a hook candidate.
     * @param {string} candidateId Id of the candidate in hex format.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async withdraw(candidateId, options = {}) {
        if (!(await this.isRegistered()))
            throw 'Host should be registered to withdraw candidates.';

        options.transactionOptions = { maxLedgerIndex: this.#getMaxLedgerSequence(), ...(options.transactionOptions || {}) }
        return await super._withdraw(candidateId, options);
    }

    /**
     * Report dud host for removal.
     * @param {string} hostAddress Address of the dud host.
     * @param {*} options [Optional] transaction options.
     * @returns Transaction result.
     */
    async reportDudHost(hostAddress, options = {}) {
        if (!(await this.isRegistered()))
            throw 'Host should be registered to report dud hosts.';

        options.transactionOptions = { maxLedgerIndex: this.#getMaxLedgerSequence(), ...(options.transactionOptions || {}) }
        return await this._reportDudHost(hostAddress, options);
    }
}

module.exports = {
    HostEvents,
    HostClient
}

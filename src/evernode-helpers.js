const { EvernodeConstants, URITokenTypes } = require('./evernode-common');
const { TransactionHelper } = require('./transaction-helper');
const { XrplApi } = require('./xrpl-api');

const NFT_PAGE_LEDGER_ENTRY_TYPE_HEX = '0050';

/**
 * Provides various utility functions for working with leases, tokens, and ledger entries within the Xahau ecosystem.
 */
class EvernodeHelpers {
    /**
     * Retrieves URI tokens that are valid leases for the specified XRPL account.
     *
     * @param {Object} xrplAcc - The XRPL account object.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of URI tokens that are valid leases.
     */
    static async getLeases(xrplAcc) {
        const hostUriOffers = (await xrplAcc.getURITokens()).filter(uriToken => uriToken.Issuer == xrplAcc.address && this.isValidURI(uriToken.URI, EvernodeConstants.LEASE_TOKEN_PREFIX_HEX) && uriToken.Flags == 1);
        return hostUriOffers;
    }

    /**
     * Retrieves a lease by its index from the XRPL ledger.
     *
     * @param {XrplApi} xrplApi - The XRPL API object.
     * @param {string} index - The ledger entry index.
     * @returns {Promise<Object|null>} A promise that resolves to the lease entry or null if not found or invalid.
     */
    static async getLeaseByIndex(xrplApi, index) {
        const entry = await xrplApi.getLedgerEntry(index);
        if (!entry || entry.LedgerEntryType !== 'URIToken' || !(this.isValidURI(entry.URI, EvernodeConstants.LEASE_TOKEN_PREFIX_HEX) && entry.Flags == 1))
            return null;
        return entry;
    }

    /**
     * Retrieves all leases that have offers (i.e., an associated amount) for the specified XRPL account.
     *
     * @param {Object} xrplAcc - The XRPL account object.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of URI tokens with offers.
     */
    static async getLeaseOffers(xrplAcc) {
        const hostUriOffers = (await this.getLeases(xrplAcc)).filter(uriToken => uriToken.Amount);
        return hostUriOffers;
    }

    /**
     * Retrieves leases that do not have offers (i.e., no amount associated) for the specified XRPL account.
     *
     * @param {Object} xrplAcc - The XRPL account object.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of unoffered URI tokens.
     */
    static async getUnofferedLeases(xrplAcc) {
        const hostUriTokens = (await this.getLeases(xrplAcc)).filter(uriToken => !uriToken.Amount);
        return hostUriTokens
    }

    /**
     * Finds the NFT page and location of a specific NFToken in the XRPL ledger.
     *
     * @param {string} nfTokenId - The ID of the NFToken.
     * @param {Object} xrplAcc - The XRPL account object.
     * @param {Object} xrplApi - The XRPL API object.
     * @param {boolean} [buffer=true] - Whether to return the result as a buffer.
     * @returns {Promise<Buffer|Object>} A promise that resolves to either a buffer with the NFT page and location or an object with page and location details.
     */
    static async getNFTPageAndLocation(nfTokenId, xrplAcc, xrplApi, buffer = true) {

        const nftPageApprxKeylet = xrplAcc.generateKeylet('nftPage', { nfTokenId: nfTokenId });
        const nftPageMaxKeylet = xrplAcc.generateKeylet('nftPageMax');
        // Index is the last 32 bytes of the Keylet (Last 64 HEX characters).
        let page = await xrplApi.getLedgerEntry(nftPageMaxKeylet.substring(4, 68));
        while (page?.PreviousPageMin) {
            // Compare the low 96 bits. (Last 24 HEX characters).
            if (Number('0x' + page.index.substring(40, 64)) >= Number('0x' + nftPageApprxKeylet.substring(40, 64))) {
                // Check the existence of the NFToken
                let token = page.NFTokens.find(n => n.NFToken.NFTokenID == nfTokenId);
                if (!token) {
                    page = await xrplApi.getLedgerEntry(page.PreviousPageMin);
                }
                else
                    break;
            }
        }

        const nftPageInfo = page.NFTokens.map((n, loc) => { return { NFTPage: NFT_PAGE_LEDGER_ENTRY_TYPE_HEX + page.index, NFTokenID: n.NFToken.NFTokenID, location: loc } }).find(n => n.NFTokenID == nfTokenId);
        if (buffer) {
            let locBuf = Buffer.alloc(2, 0);
            locBuf.writeUInt16BE(nftPageInfo.location);
            // <NFT_PAGE_KEYLET(34 bytes)><LOCATION(2 bytes)>
            return Buffer.concat([Buffer.from(nftPageInfo.NFTPage, "hex"), locBuf]);
        }

        return nftPageInfo;
    }

    /**
     * Calculates the reward quota for a specific epoch.
     *
     * @param {number} epoch - The epoch number.
     * @param {number} firstEpochRewardQuota - The reward quota for the first epoch.
     * @returns {number} The calculated reward quota for the specified epoch.
     */
    static getEpochRewardQuota(epoch, firstEpochRewardQuota) {
        const div = (epoch > 1) ? Math.pow(2, epoch - 1) : 1;
        return firstEpochRewardQuota / div;
    }

    /**
     * Checks if a given URI is valid based on a pattern and token category.
     *
     * @param {string} uri - The URI to validate.
     * @param {string} pattern - The pattern to match the URI against.
     * @param {string} [tokenCategory=URITokenTypes.LEASE_URI_TOKEN] - The token category (default is a lease URI token).
     * @returns {boolean} Returns true if the URI is valid, false otherwise.
     */
    static isValidURI(uri, pattern, tokenCategory = URITokenTypes.LEASE_URI_TOKEN) {
        if (tokenCategory === URITokenTypes.LEASE_URI_TOKEN) {
            uri = TransactionHelper.hexToASCII(uri);
            const uriBuf = Buffer.from(uri, 'base64');
            uri = uriBuf.toString('hex').toUpperCase();
        }
        return uri.startsWith(pattern);
    }
}

module.exports = {
    EvernodeHelpers
}
const { EvernodeConstants, URITokenTypes } = require('./evernode-common');
const { TransactionHelper } = require('./transaction-helper');

const NFT_PAGE_LEDGER_ENTRY_TYPE_HEX = '0050';

class EvernodeHelpers {
    static async getLeases(xrplAcc) {
        const hostUriOffers = (await xrplAcc.getURITokens()).filter(uriToken => uriToken.Issuer == xrplAcc.address && this.isValidURI(uriToken.URI, EvernodeConstants.LEASE_TOKEN_PREFIX_HEX) && uriToken.Flags == 1);
        return hostUriOffers;
    }

    static async getLeaseOffers(xrplAcc) {
        const hostUriOffers = (await this.getLeases(xrplAcc)).filter(uriToken => uriToken.Amount);
        return hostUriOffers;
    }

    static async getUnofferedLeases(xrplAcc) {
        const hostUriTokens = (await this.getLeases(xrplAcc)).filter(uriToken => !uriToken.Amount);
        return hostUriTokens
    }

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
            let locBuf = Buffer.alloc(2,0);
            locBuf.writeUInt16BE(nftPageInfo.location);
            // <NFT_PAGE_KEYLET(34 bytes)><LOCATION(2 bytes)>
            return Buffer.concat([Buffer.from(nftPageInfo.NFTPage, "hex"), locBuf]);
        }

        return nftPageInfo;
    }

    static getEpochRewardQuota(epoch, firstEpochRewardQuota) {
        const div = (epoch > 1) ? Math.pow(2, epoch - 1) : 1;
        return firstEpochRewardQuota / div;
    }

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
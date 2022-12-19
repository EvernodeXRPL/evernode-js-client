const { EvernodeConstants } = require('./evernode-common');
const NFT_PAGE_LEDGER_ENTRY_TYPE_HEX = '0050';

class EvernodeHelpers {
    static async getLeaseOffers(xrplAcc) {
        const hostNfts = (await xrplAcc.getNfts()).filter(nft => nft.URI.startsWith(EvernodeConstants.LEASE_NFT_PREFIX_HEX));
        const hostTokenIDs = hostNfts.map(nft => nft.NFTokenID);
        const nftOffers = (await xrplAcc.getNftOffers())?.filter(offer => (offer.Flags == 1 && hostTokenIDs.includes(offer.NFTokenID))); // Filter only sell offers
        return nftOffers;
    }

    static async getNFTPageAndLocation(nfTokenId, xrplAcc, xrplApi, buffer = true) {

        const nftPageApprxKeylet = await xrplAcc.generateKeylet('nftPage', { nfTokenId: nfTokenId });
        const nftPageMaxKeylet = await xrplAcc.generateKeylet('nftPageMax');
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
            let locBuf = Buffer.allocUnsafe(2);
            locBuf.writeUInt16BE(nftPageInfo.location);
            // <NFT_PAGE_KEYLET(34 bytes)><LOCATION(2 bytes)>
            return Buffer.concat([Buffer.from(nftPageInfo.NFTPage, "hex"), locBuf]);
        }

        return nftPageInfo;
    }
}

module.exports = {
    EvernodeHelpers
}
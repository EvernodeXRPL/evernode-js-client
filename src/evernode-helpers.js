const { EvernodeConstants } = require('./evernode-common');

class EvernodeHelpers {
    static async getLeaseOffers(xrplAcc) {
        const hostNfts = (await xrplAcc.getNfts()).filter(nft => nft.URI.startsWith(EvernodeConstants.LEASE_NFT_PREFIX_HEX));
        const hostTokenIDs = hostNfts.map(nft => nft.NFTokenID);
        const nftOffers = (await xrplAcc.getNftOffers())?.filter(offer => (offer.Flags == 1 && hostTokenIDs.includes(offer.NFTokenID))); // Filter only sell offers
        return nftOffers;
    }
}

module.exports = {
    EvernodeHelpers
}
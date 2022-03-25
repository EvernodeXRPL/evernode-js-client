// 1. Host mints non transferable lease nft with uri contains 'evrlease<ToS hash><Lease amount>'
// 2. Host creates a sell offer with sell price of 'Lease amount' for the minted nft
// 3. Host listens to incomming sell offer acceptance with 'aquireLease' memo type, fetch NFTokenId from memo and verify the ownership
// 4. Tenant finds for nft offers created by host which contains 'evrlease' prefix in nft uri
// 5. Tenant accepts offer with instance <NFTokenId><requirement> with memo type 'acquireLease'

// Note : We do not need to send the NFTokenId with 'acquireLease' memo if we can find the NFT from the Sell Offer index


const xrpl = require('xrpl');
const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
const my = {
    address: 'rG33Y4BwRVUJDfyqBiqu2Yuk3MsnZa7LG3',
    secret: 'sha2vMoKG5dRrBRgKWsv49KffUdFG'
}
const leasePrefix = 'evrlease'
const uri = 'test uri';
const wallet = xrpl.Wallet.fromSeed(my.secret);

const tenant = {
    address: 'r43Mr5cbRtr5WFYP8xvdGaAtWzDeK5JxPS',
    secret: 'sszL8M72887y3SCwg8JhMfz24J6ZJ'
}
const twallet = xrpl.Wallet.fromSeed(tenant.secret);

function hexToAscii(hex) {
    return Buffer.from(hex, 'hex').toString();
}

function asciiToHex(ascii) {
    return Buffer.from(ascii).toString('hex').toUpperCase();
}

const leaseUri = asciiToHex(`${leasePrefix}${uri}`);

async function main() {
    await client.connect();

    // Mint nft.
    let obj = {
        TransactionType: 'NFTokenMint',
        Account: my.address,
        URI: leaseUri,
        TokenTaxon: 0,
        TransferFee: 0,
        Flags: 1
    };
    let res = await client.submitAndWait(obj, { autofill: true, wallet: wallet });

    // Get nft tokenId
    const nfts = (await client.request({ command: 'account_nfts', account: my.address, ledger_index: "validated" }))?.result?.account_nfts;
    const nft = nfts?.find(n => n.URI === leaseUri);

    // Create offer
    obj = {
        TransactionType: 'NFTokenCreateOffer',
        Account: my.address,
        TokenID: nft.TokenID,
        Amount: "1",
        Flags: 1
    };
    res = await client.submitAndWait(obj, { autofill: true, wallet: wallet });

    // Listening to acceptance.
    client.request({ command: 'subscribe', accounts: [my.address] })
    client.on("transaction", (data) => {
        if (data.engine_result === 'tesSUCCESS' && data.transaction.TransactionType === 'NFTokenAcceptOffer') {
            if (data.transaction.Account !== my.address && data.transaction.SellOffer && !data.transaction.BuyOffer) {
                console.log(data.transaction)
                console.log(data.transaction.SellOffer)
                console.log(`Creating instance ${hexToAscii(data.transaction.Memos[0].Memo.MemoData, 'hex')}`);
            }
        }
    });

    // Get offers
    const offers = (await client.request({ command: 'account_objects', account: my.address }))?.result?.account_objects?.filter(o => o.LedgerEntryType === 'NFTokenOffer');
    const offer = offers.filter(o => o.Flags === 1 && o.Owner === my.address && !o.Destination)?.find(o => 
        nfts.findIndex(n => n.TokenID === o.TokenID && n.URI.startsWith(asciiToHex(leasePrefix))) >= 0);

    // Accept offer
    obj = {
        TransactionType: 'NFTokenAcceptOffer',
        Account: tenant.address,
        SellOffer: offer.index,
        Memos: [
            {
                Memo: {
                    MemoType: asciiToHex('acquireLease'),
                    MemoFormat: asciiToHex('base64'),
                    MemoData: asciiToHex('testdata')
                }
            }
        ]
    };
    res = await client.submitAndWait(obj, { autofill: true, wallet: twallet });

    await client.disconnect();
}

main().catch(console.error)
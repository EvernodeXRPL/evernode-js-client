// const { EvernodeClient } = require("evernode-js-client"); // Published npm package.
const { EvernodeClient, XrplAccount } = require("../dist"); // Local dist dir.

async function app() {
    const client = new EvernodeClient("rfNQEMZwRt8wQnGr3ktuwWKRSXzk8oAFbm", "spyzh41Huy8imGCn1jqYcEPaCA16j");
    
    try {
        await client.connect();
        console.log("Connected.");
        // var acc = new XrplAccount(client.rippleAPI, "rfNQEMZwRt8wQnGr3ktuwWKRSXzk8oAFbm");
        // console.log(await acc.getTrustLines());

        // const ret = await client.redeem('HTK', 'rwUBBXWy7asVC3cZq6pUbKpeKjq3Kk9Exx', 12, {
        //     owner_pubkey: 'ed5cb83404120ac759609819591ef839b7d222c84f1f08b3012f490586159d2b50',
        //     contract_id: '8ec3db87-4514-4779-be46-0b092323aedb',
        //     image: 'hp.latest-ubt.20.04',
        //     config: {}
        // })
        // const ret = await client.refund('37C300FBC194FC9CC7B22EC2D9CCD1CF5345B39451E714033161C6C5138B0C21');
        // const ret = await client.requestAudit();
        // const ret = await client.auditSuccess();
        // console.log(ret);
        
        await client.disconnect();
        console.log("Disconnected.");
    } catch (e) {
        console.error(e);
    }
}

app();

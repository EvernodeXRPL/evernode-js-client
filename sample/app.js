// const { EvernodeClient } = require("evernode-js-client"); // Published npm package.
const { EvernodeClient, XrplAccount } = require("../dist"); // Local dist dir.

async function app() {
    const client = new EvernodeClient("rfNQEMZwRt8wQnGr3ktuwWKRSXzk8oAFbm", "spyzh41Huy8imGCn1jqYcEPaCA16j");
    await client.connect();
    console.log("Connected.");

    // var acc = new XrplAccount(client.rippleAPI, "rfNQEMZwRt8wQnGr3ktuwWKRSXzk8oAFbm");
    // console.log(await acc.getTrustLines());

    await client.disconnect();
    console.log("Disconnected.");
}

app();

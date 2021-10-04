const { EvernodeClient } = require("evernode-js-ravinsp");

async function app() {
    const client = new EvernodeClient("rfNQEMZwRt8wQnGr3ktuwWKRSXzk8oAFbm", "spyzh41Huy8imGCn1jqYcEPaCA16j");
    await client.connect();
    console.log("Connected.");

    await client.disconnect();
    console.log("Disconnected.");
}

app();

// const evernode = require("evernode-js-client"); // Published npm package.
const evernode = require("../dist"); // Local dist dir.

async function app() {

    const hook = new evernode.HookClient("rfNQEMZwRt8wQnGr3ktuwWKRSXzk8oAFbm");

    try {
        await hook.connect();
        console.log(await hook.getHosts());

        // const user = new evernode.UserClient("<address>", "<secret>");
        // await user.redeem('HTK', 'rwUBBXWy7asVC3cZq6pUbKpeKjq3Kk9Exx', 12, {
        //     owner_pubkey: 'ed5cb83404120ac759609819591ef839b7d222c84f1f08b3012f490586159d2b50',
        //     contract_id: '8ec3db87-4514-4779-be46-0b092323aedb',
        //     image: 'hp.latest-ubt.20.04',
        //     config: {}
        // })

    } catch (e) {
        console.error("Error occured:", e);
    } finally {
        await hook.disconnect();
    }
}

app();

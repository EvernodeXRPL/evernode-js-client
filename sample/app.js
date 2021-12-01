const evernode = require("evernode-js-client");

const hookAddress = "rUaYV9Mtbu1XHCe7tYfmoJ5m5An977AtLp";
const hookSecret = "spyYCouK3a5VXJxVX6Vu1MGyLgZtE";
const hostAddress = "rfjtFb8xz4mmocFgpvpJjp8hbfAWZ3JCgb";
const hostSecret = "shGDdT5nb7oVjJSYBs7BUsQTbfmdN";

const xrplApi = new evernode.XrplApi();

async function app() {

    evernode.Defaults.set({
        hookAddress: hookAddress,
        xrplApi: xrplApi
    })

    try {
        await xrplApi.connect();

        await registerHost();
        await getHosts();

    }
    catch (e) {
        console.error("Error occured:", e);
    }
    finally {
        await xrplApi.disconnect();
    }
}

async function registerHost() {

    const client = new evernode.HostClient(hostAddress, hostSecret, { xrplApi: xrplApi });
    await client.connect();
    // await client.prepare();

    // Get EVRs from the hook.
    const hookAcc = new evernode.XrplAccount(hookAddress, hookSecret);
    await hookAcc.makePayment(hostAddress, "1000", evernode.EvernodeConstants.EVR, hookAddress);

    await client.register("ABC", "8GB", "AU");
}

async function getHosts() {
    const client = new evernode.HookClient();
    await client.connect();
    console.log(await client.getHosts());
}

app();

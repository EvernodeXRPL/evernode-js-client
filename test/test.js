const evernode = require("evernode-js-client");

const hookAddress = "rHGY4fZUSqowzjArrPbJrPRUPLqLz9pAte";
const hookSecret = "shr6tWYFRefogap9pdLDoRrUNRfHN";
const hostAddress = "rfjtFb8xz4mmocFgpvpJjp8hbfAWZ3JCgb";
const hostSecret = "shGDdT5nb7oVjJSYBs7BUsQTbfmdN";
const hostToken = "ABC";
const userAddress = "r4DKWDEgr6faS7XnKeKKRmorFqufT9NrNa";
const userSecret = "ssHufjnAFacFSZsoen8i4KVVtUFQa";

const clients = [];

async function app() {

    const xrplApi = new evernode.XrplApi();
    evernode.Defaults.set({
        hookAddress: hookAddress,
        xrplApi: xrplApi
    })

    try {
        await xrplApi.connect();

        const tests = [
            () => registerHost(),
            () => redeem("success"),
            () => redeem("error"),
            () => redeem("timeout")];

        for (test of tests) {
            await test();
            await Promise.all(clients.map(c => c.disconnect())); // Cleanup clients after every test.
        }

    }
    catch (e) {
        console.error("Error occured:", e);
    }
    finally {
        await xrplApi.disconnect();
    }
}

async function registerHost() {
    const host = await getHostClient();

    if (await host.isRegistered())
        return;

    console.log(`-----------Register host`);

    // Prepare host account for Evernode.
    console.log("Prepare...");
    await host.prepareAccount();

    // Get EVRs from the hook if needed.
    const lines = await host.xrplAcc.getTrustLines(evernode.EvernodeConstants.EVR, hookAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 100) {
        console.log("Transfer EVRs...");
        const hookAcc = new evernode.XrplAccount(hookAddress, hookSecret);
        await hookAcc.makePayment(hostAddress, "1000", evernode.EvernodeConstants.EVR, hookAddress);
    }

    console.log("Register...");
    await host.register(hostToken, "8GB", "AU");

    // Verify the registration.
    console.log(await host.getRegistration());
}

function redeem(scenario) {
    return new Promise(async (resolve) => {

        console.log(`-----------Redeem (${scenario})`);

        let tasks = 0;

        const user = await getUserClient();
        await user.prepareAccount();

        // Setup host to watch for incoming redeems.
        const host = await getHostClient();

        host.on(evernode.HostEvents.Redeem, async (r) => {
            console.log(`Host received redeem request: '${r.payload}'`);

            if (scenario !== "timeout") {
                console.log(`Host submitting ${scenario} response...`);

                if (scenario === "success")
                    await host.redeemSuccess(r.redeemRefId, userAddress, { content: "dummy success" });
                else if (scenario === "error")
                    await host.redeemError(r.redeemRefId, "dummy_error");
            }

            if (++tasks === 2)
                resolve();
        })

        // Send hosting tokens to user if needed.
        const lines = await user.xrplAcc.getTrustLines(hostToken, hostAddress);
        if (lines.length === 0 || parseInt(lines[0].balance) < user.hookConfig.minRedeem) {
            await user.xrplAcc.setTrustLine(hostToken, hostAddress, "99999999");
            await host.xrplAcc.makePayment(userAddress, "1000", hostToken, hostAddress);
        }

        const result = await user.redeem(hostToken, hostAddress, user.hookConfig.minRedeem, "dummy request", { timeout: 10000 })
            .catch(err => console.log("User recieved redeem error: ", err.reason));

        if (result)
            console.log(`User received instance '${result.instance}'`);

        if (++tasks === 2)
            resolve();
    })
}

async function getUserClient() {
    const client = new evernode.UserClient(userAddress, userSecret);
    await client.connect();
    clients.push(client);
    return client;
}

async function getHostClient() {
    const client = new evernode.HostClient(hostAddress, hostSecret);
    await client.connect();
    clients.push(client);
    return client;
}

async function getHookClient() {
    const client = new evernode.HookClient(hookAddress, hookSecret);
    await client.connect();
    clients.push(client);
    return client;
}

app();

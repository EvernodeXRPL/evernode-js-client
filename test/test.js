const evernode = require("evernode-js-client");

const hookAddress = "rUaYV9Mtbu1XHCe7tYfmoJ5m5An977AtLp";
const hookSecret = "spyYCouK3a5VXJxVX6Vu1MGyLgZtE";
const hostAddress = "rfjtFb8xz4mmocFgpvpJjp8hbfAWZ3JCgb";
const hostSecret = "shGDdT5nb7oVjJSYBs7BUsQTbfmdN";
const hostToken = "ABC";
const userAddress = "r4DKWDEgr6faS7XnKeKKRmorFqufT9NrNa";
const userSecret = "ssHufjnAFacFSZsoen8i4KVVtUFQa";

const xrplApi = new evernode.XrplApi();

async function app() {

    evernode.Defaults.set({
        hookAddress: hookAddress,
        xrplApi: xrplApi
    })

    try {
        await xrplApi.connect();

        await registerHost();
        await redeem();

    }
    catch (e) {
        console.error("Error occured:", e);
    }
    finally {
        await xrplApi.disconnect();
    }
}

async function registerHost() {

    const host = new evernode.HostClient(hostAddress, hostSecret);
    await host.connect();

    if (await host.isRegistered())
        return;

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
    console.log(await host);
}

async function redeem() {

    const user = new evernode.UserClient(userAddress, userSecret);
    await user.connect();
    await user.prepareAccount();

    console.log("Redeem...");

    // Setup host to watch for incoming redeems.
    const host = new evernode.HostClient(hostAddress, hostSecret);
    await host.connect();

    host.on(evernode.HostEvents.Redeem, async (r) => {
        console.log(`Host received redeem request: ${r.payload}`)
        await host.redeemSuccess(r.transaction.hash, userAddress, "dummy success");
    })

    // Send hosting tokens to user if needed.
    const lines = await user.xrplAcc.getTrustLines(hostToken, hostAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < user.hookConfig.minRedeem) {
        await user.xrplAcc.setTrustLine(hostToken, hostAddress, "99999999");
        await host.xrplAcc.makePayment(userAddress, "1000", hostToken, hostAddress);
    }

    const result = await user.redeem(hostToken, hostAddress, user.hookConfig.minRedeem, "dummy request");
    console.log(result);
}

app();

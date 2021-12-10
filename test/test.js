// const evernode = require("evernode-js-client");
const evernode = require("../dist"); // Local dist dir.

const hookAddress = "rHxCwRQcSDr5b2Ln4onZiSBG58Jvm1BoXK";
const hookSecret = "shKu6kobQjGSRroK1dm9TgzwWZWPV";
const hostAddress = "rfjtFb8xz4mmocFgpvpJjp8hbfAWZ3JCgb";
const hostSecret = "shGDdT5nb7oVjJSYBs7BUsQTbfmdN";
const hostToken = "ABC";
const extra_hostAddress = "rBdWg75namZt6qsKeLQ64NaLv5o864mLJG";
const extra_hostSecret = "ssK25HB6tfTzcsGKWRyEuabiwPQis";
const extra_hostToken = "ABD";
const userAddress = "r4DKWDEgr6faS7XnKeKKRmorFqufT9NrNa";
const userSecret = "ssHufjnAFacFSZsoen8i4KVVtUFQa";
const auditorAddress = "rUWDtXPk4gAp8L6dNS51hLArnwFk4bRxky";
const auditorSecret = "snUByxoPxYHTZjUBg38X8ihHk5QVi";

const auditHosts = [
    {
        address: hostAddress,
        secret: hostSecret,
        token: hostToken
    },
    {
        address: extra_hostAddress,
        secret: extra_hostSecret,
        token: extra_hostToken
    }
]

// const rippledServer = 'ws://localhost:6005';
const rippledServer = 'wss://hooks-testnet.xrpl-labs.com'; // Testnet.

const clients = [];

async function app() {

    // Use a singleton xrplApi for all tests.
    const xrplApi = new evernode.XrplApi(rippledServer);
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
            () => redeem("timeout"),
            () => refundInvalid(),
            () => auditRequest(),
            () => auditResponse("success", "failed"),
            // () => refundValid() // Must use short moment size and redeem window in the hook to test this.
        ];

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

async function registerHost(address = hostAddress, secret = hostSecret, token = hostToken) {
    const host = await getHostClient(address, secret);

    if (await host.isRegistered())
        return true;

    console.log(`-----------Register host`);

    // Prepare host account for Evernode.
    console.log("Prepare...");
    await host.prepareAccount();

    // Get EVRs from the hook if needed.
    const lines = await host.xrplAcc.getTrustLines(evernode.EvernodeConstants.EVR, address);
    if (lines.length === 0 || parseInt(lines[0].balance) < 100) {
        console.log("Transfer EVRs...");
        const hookAcc = new evernode.XrplAccount(address, secret);
        await hookAcc.makePayment(address, "1000", evernode.EvernodeConstants.EVR, address);
    }

    console.log("Register...");
    await host.register(token, "8GB", "AU");

    // Verify the registration.
    return await host.isRegistered();
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
                await new Promise(resolve => setTimeout(resolve, 4000));

                if (scenario === "success")
                    await host.redeemSuccess(r.redeemRefId, userAddress, { content: "dummy success" });
                else if (scenario === "error")
                    await host.redeemError(r.redeemRefId, "dummy_error");
            }

            if (++tasks === 2)
                resolve();
        })

        await fundUser(user);

        try {
            const timeout = (scenario === "timeout" ? 10000 : 30000);
            const result = await user.redeem(hostToken, hostAddress, user.hookConfig.minRedeem, "dummy request", { timeout: timeout });
            console.log(`User received instance '${result.instance}'`);
        }
        catch (err) {
            console.log("User recieved redeem error: ", err.reason)
        }

        if (++tasks === 2)
            resolve();
    })
}

async function refundValid() {
    console.log(`-----------Refund (valid)`);

    const user = await getUserClient();
    await user.prepareAccount();
    await fundUser(user);

    try {
        await user.redeem(hostToken, hostAddress, user.hookConfig.minRedeem, "dummy request", { timeout: 2000 })
    }
    catch (err) {
        console.log("User recieved redeem error: ", err.reason)

        const hookClient = await getHookClient();
        const startMoment = await hookClient.getMoment();

        console.log(`Waiting until current Moment (${startMoment}) passes for refund...`);

        while (true) {
            await new Promise(resolve => setTimeout(resolve, 4000));
            const moment = await hookClient.getMoment();
            if (moment > startMoment) {
                console.log(`Entered into Moment ${moment}. Proceeding...`);
                break;
            }
            else {
                console.log(`Still in Moment ${moment}. Waiting...`);
            }
        }

        try {
            await user.refund(err.redeemRefId);
            console.log("Refund success");

        }
        catch (err) {
            console.log("Refund error: ", err.reason);
        }
    }
}

async function refundInvalid() {
    console.log(`-----------Refund (invalid)`);

    const user = await getUserClient();
    await user.prepareAccount();
    await fundUser(user);

    try {
        await user.redeem(hostToken, hostAddress, user.hookConfig.minRedeem, "dummy request", { timeout: 2000 })
    }
    catch (err) {
        console.log("User recieved redeem error: ", err.reason)
        console.log("Immedidately initiating refund...");

        // Refund will fail because refund has to wait until the current Moment passes.

        const refund = await user.refund(err.redeemRefId).catch(err => console.log("Refund error: ", err.reason));
        if (refund)
            console.log("Refund success");
    }
}

//////////////////////////////////////////////////////////////////////////////////////
/// Audit test is targetted for the hook which commented out check creation        ///
/// So audit assignment event cannot be tested properly until check issue is fixed ///

async function auditRequest() {
    console.log(`-----------Audit request`);

    for (const auditHost of auditHosts)
        await registerHost(auditHost.address, auditHost.secret, auditHost.token);

    const hook = await getHookClient();
    const auditor = await getAuditorClient();

    console.log(`Reward pool value before audit request: ${await hook.getRewardPool()}`);

    console.log(`<Moment: ${await hook.getMoment()}> Sending auditor request...`);
    await auditor.requestAudit();

    console.log(`Reward pool value after audit request: ${await hook.getRewardPool()}`);
}

async function auditResponse(...scenarios) {
    return new Promise(async (resolve) => {

        console.log(`-----------Audit response (${scenarios})`);

        tasks = 0;

        const hook = await getHookClient();
        const auditor = await getAuditorClient();

        // Send audit response to all the hosts, since we know all two hosts will be assigned to default auditor
        for (const [i, auditHost] of auditHosts.entries()) {
            const host = await getHostClient(auditHost.address, auditHost.secret);

            host.on(evernode.HostEvents.Reward, async (r) => {
                console.log(`<Moment: ${await hook.getMoment()}> Host ${auditHost.address} received reward: '${r.amount}'`);

                if (++tasks == auditHosts.length) {
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    resolve();
                }
            })

            console.log(`<Moment: ${await hook.getMoment()}> Sending auditor response (${scenarios[i] || 'Not specified'}) to ${auditHost.address}...`);
            if (scenarios[i] === "success")
                await auditor.auditSuccess(auditHost.address);
            else if (scenarios[i] === "failed") {
                console.log(`Reward pool value before audit failure: ${await hook.getRewardPool()}`);
                await auditor.auditFail(auditHost.address);
                console.log(`Reward pool value after audit failure: ${await hook.getRewardPool()}`);

                if (++tasks == auditHosts.length) {
                    await new Promise(resolve => setTimeout(resolve, 4000));
                    resolve();
                }
            }
            else if (++tasks == auditHosts.length) {
                await new Promise(resolve => setTimeout(resolve, 4000));
                resolve();
            }
        }
    });
}

//////////////////////////////////////////////////////////////////////////////////////

async function getUserClient() {
    const client = new evernode.UserClient(userAddress, userSecret);
    await client.connect();
    clients.push(client);
    return client;
}

async function getHostClient(address = hostAddress, secret = hostSecret) {
    const client = new evernode.HostClient(address, secret);
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

async function getAuditorClient() {
    const client = new evernode.AuditorClient(auditorAddress, auditorSecret);
    await client.connect();
    clients.push(client);
    return client;
}

async function fundUser(user) {
    // Send hosting tokens to user if needed.
    const lines = await user.xrplAcc.getTrustLines(hostToken, hostAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < user.hookConfig.minRedeem) {
        await user.xrplAcc.setTrustLine(hostToken, hostAddress, "99999999");
        await new evernode.XrplAccount(hostAddress, hostSecret).makePayment(userAddress, "1000", hostToken, hostAddress);
    }
}

app();

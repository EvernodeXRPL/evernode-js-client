// const evernode = require("evernode-js-client");
const evernode = require("../dist");  // Local dist dir. (use 'npm run build' to update)

const evrIssuerAddress = "rPeayir8ZgztXDt2yTRsv2veHqFRTreAe1";
const registryAddress = "rBwEV4MDQuSqsPWhY3sVevWnin5NEHZgXs";
const registrySecret = "shYeka6uDt6cyUx5JqCit4rH7oypk";
const hostAddress = "r4SCD3XsMDhZJb43tCN7uNe9DjCSfozgKc";
const hostSecret = "sh8p6qLWbJ7iGHcmdn5jSQzj4EzTF";
const hostToken = "ABC";
const userAddress = "rKCp2EyWg94c1keic83SHzWEuQXy5Am6Ni";
const userSecret = "spzjw4ZC36Nzy7yggVurfH3ESjvbk";

const rippledServer = 'wss://xls20-sandbox.rippletest.net:51233';

const clients = [];

async function app() {

    // Use a singleton xrplApi for all tests.
    const xrplApi = new evernode.XrplApi(rippledServer);
    evernode.Defaults.set({
        registryAddress: registryAddress,
        xrplApi: xrplApi
    })

    try {
        await xrplApi.connect();

        // Process of minting and selling a NFT.

        // Account1: selling party.
        const acc1 = new evernode.XrplAccount(registryAddress, registrySecret);
        // Mint an nft with some data included in uri (256 bytes). xrpl doesn't check for uniqueness of data.
        // We need to make it unique in order to later find the token by uri.
        const uri = "mynft custom data";
        await acc1.mintNft(uri, 0, 0, true);
        // Get the minted nft information and sell it on the dex.
        const nft = await acc1.getNftByUri(uri);
        console.log(nft);
        // Make a sell offer (for free) while restricting it to be only purchased by the specified party.
        await acc1.offerSellNft(nft.TokenID, hostAddress, '0', 'XRP');

        // Account2: Buying party.
        const acc2 = new evernode.XrplAccount(hostAddress, hostSecret);
        // Find the sellOffer information from seller's account.
        const sellOffer = (await acc1.getNftOffers()).find(o => o.TokenID == nft.TokenID);
        console.log(sellOffer);
        // Buy the NFT by accepting the sell offer.
        await acc2.buyNft(sellOffer.index);
        // Get information about the purchased nft.
        const nft2 = await acc2.getNftByUri(uri);
        console.log(nft2);

        // const tests = [
        //     () => registerHost(),
        //     () => getAllHosts(),
        //     () => getActiveHosts(),
        //     () => redeem("success"),
        //     () => redeem("error"),
        //     () => redeem("timeout"),
        //     () => deregisterHost(),
        // ];

        // for (const test of tests) {
        //     await test();
        //     await Promise.all(clients.map(c => c.disconnect())); // Cleanup clients after every test.
        // }

    }
    catch (e) {
        console.error("Error occured:", e);
    }
    finally {
        await xrplApi.disconnect();
    }
}

async function getAllHosts() {
    console.log(`-----------Getting all hosts (including inactive)`);

    const regClient = await getRegistryClient();
    const hosts = await regClient.getAllHosts();

    console.log("All hosts", hosts || "No hosts");
}

async function getActiveHosts() {
    console.log(`-----------Getting active hosts`);

    const regClient = await getRegistryClient();
    const hosts = await regClient.getActiveHosts();

    console.log("Hosts", hosts || "No active hosts");
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
    const lines = await host.xrplAcc.getTrustLines(evernode.EvernodeConstants.EVR, registryAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 100) {
        console.log("Transfer EVRs...");
        const hookAcc = new evernode.XrplAccount(registryAddress, registrySecret);
        await hookAcc.makePayment(address, "1000", evernode.EvernodeConstants.EVR, registryAddress);
    }

    console.log("Register...");
    await host.register(token, "AU", 10000, 512, 1024, "Test desctiption");

    // Verify the registration.
    return await host.isRegistered();
}

async function deregisterHost(address = hostAddress, secret = hostSecret) {
    const host = await getHostClient(address, secret);

    if (!await host.isRegistered())
        return true;

    console.log(`-----------Deregister host`);

    await host.deregister();

    // Verify the deregistration.
    return !await host.isRegistered();
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
            const result = await user.redeem(hostToken, hostAddress, 1, "dummy request", { timeout: timeout });
            console.log(`User received instance '${result.instance}'`);
        }
        catch (err) {
            console.log("User recieved redeem error: ", err.reason)
        }

        if (++tasks === 2)
            resolve();
    })
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

async function getRegistryClient() {
    const client = new evernode.RegistryClient(registryAddress, registrySecret);
    await client.connect();
    clients.push(client);
    return client;
}

async function fundUser(user) {
    // Send hosting tokens to user if needed.
    const lines = await user.xrplAcc.getTrustLines(hostToken, hostAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 1) {
        await user.xrplAcc.setTrustLine(hostToken, hostAddress, "99999999");
        await new evernode.XrplAccount(hostAddress, hostSecret).makePayment(userAddress, "1000", hostToken, hostAddress);
    }
}

app();

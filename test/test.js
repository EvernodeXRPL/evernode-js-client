// const evernode = require("evernode-js-client");
const evernode = require("../dist");  // Local dist dir. (use 'npm run build' to update)

const evrIssuerAddress = "rfjfQMfbQ4TvCnsmDoYxCV7xxb4WRGchAL";
const registryAddress = "rMM81n1oCyfYVRoZWG6u1zxnpFbiVjrY9s";
const registrySecret = "shbX7yYQyrRCseDK3kjPYd6b3o6xG";
const hostAddress = "rKomzVFWxM7huU4rrbs1xkXipuF8sUjKUG";
const hostSecret = "snKr9xrsLaLfomLhcGCQxekJZ58mG";
const foundationAddress = "rL3hukvCSJhDzoK2ELCZVQsJJ3EvdVT8YJ";
const foundationSecret = "ssBozzhHjCewARkwCSyGDHEhE79fV";
const userAddress = "rNLMijqrR23eJVwXHsUmSN3uz9hojKhmkJ";
const userSecret = "shJfUWrrWcm1jzuVehbk9RrTtoJqf";

const clients = [];

async function app() {

    // Use a singleton xrplApi for all tests.
    const xrplApi = new evernode.XrplApi();
    evernode.Defaults.set({
        registryAddress: registryAddress,
        xrplApi: xrplApi
    })

    try {
        await xrplApi.connect();

        // Process of minting and selling a NFT.

        // Account1: selling party.
        // const acc1 = new evernode.XrplAccount(ownerAddress, ownerSecret);
        // // Mint an nft with some data included in uri (256 bytes). xrpl doesn't check for uniqueness of data.
        // // We need to make it unique in order to later find the token by uri.
        // const uri = "mynft custom data";
        // await acc1.mintNft(uri, 0, 0, true);
        // // Get the minted nft information and sell it on the dex.
        // const nft = await acc1.getNftByUri(uri);
        // console.log(nft);
        // // Make a sell offer (for free) while restricting it to be only purchased by the specified party.
        // await acc1.offerSellNft(nft.TokenID, '0', 'XRP', null, hostAddress);

        // // Account2: Buying party.
        // const acc2 = new evernode.XrplAccount(hostAddress, hostSecret);
        // // await acc2.offerBuyNft(nft.TokenID, registryAddress, '10', 'EVR', evrIssuerAddress);

        // // const offers = await acc1.getNftOffers();
        // // console.log(offers);
        // // Find the sellOffer information from seller's account.
        // const sellOffer = (await acc1.getNftOffers()).find(o => o.TokenID == nft.TokenID);
        // console.log(sellOffer);
        // // Buy the NFT by accepting the sell offer.
        // await acc2.buyNft(sellOffer.index);
        // // Get information about the purchased nft.
        // const nft2 = await acc2.getNftByUri(uri);
        // console.log(nft2);

        // const tests = [
        //     () => initializeConfigs(),
        //     () => registerHost(),
        //     () => getAllHosts(),
        //     () => getActiveHosts(),
        //     () => acquire("success"),
        //     () => acquire("error"),
        //     () => acquire("timeout"),
        //     () => deregisterHost(),
        // ];

        // for (const test of tests) {
        //     await test();
        //     await Promise.all(clients.map(c => c.disconnect())); // Cleanup clients after every test.
        // }

        // await registerHost();
        // Accepting the sell offer created by registry.

        // const tokenID = '0008000083CD166E1806EF2076C55077AEFD418E771A516CB30E8CAE00000013';
        // const reg = new evernode.XrplAccount(registryAddress, registrySecret);
        // const sellOffer = (await reg.getNftOffers()).find(o => o.TokenID == tokenID);
        // console.log(sellOffer);
        // const host = new evernode.XrplAccount(hostAddress, hostSecret);
        // await host.buyNft(sellOffer.index);
        // const nfts = await host.getNfts();
        // console.log(nfts);
        // await host.register();
        // await initializeConfigs();
        // await registerHost();
        // await deregisterHost();

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
    const hosts = await regClient.getHosts();

    console.log("All hosts", hosts || "No hosts");
}

async function getActiveHosts() {
    console.log(`-----------Getting active hosts`);

    const regClient = await getRegistryClient();
    const hosts = await regClient.getActiveHosts();

    console.log("Hosts", hosts || "No active hosts");
}

async function initializeConfigs() {
    console.log(`-----------Initialize configs`);
    const foundationAcc = new evernode.XrplAccount(foundationAddress, foundationSecret);
    await foundationAcc.makePayment(registryAddress,
        '1',
        'XRP',
        null,
        [{ type: 'evnInitialize', format: '', data: '' }]);
}

async function registerHost(address = hostAddress, secret = hostSecret) {
    const host = await getHostClient(address, secret);

    if (await host.isRegistered())
        return true;

    console.log(`-----------Register host`);

    // Prepare host account for Evernode.
    console.log("Prepare...");
    await host.prepareAccount("mydomain.com");

    // Get EVRs from the foundation if needed.
    const lines = await host.xrplAcc.getTrustLines(evernode.EvernodeConstants.EVR, evrIssuerAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 5120) {
        console.log("Transfer EVRs...");
        const foundationAcc = new evernode.XrplAccount(foundationAddress, foundationSecret);
        await foundationAcc.makePayment(address, "5120", evernode.EvernodeConstants.EVR, evrIssuerAddress);
    }

    console.log("Register...");
    const instanceCount = 5;
    await host.register("AU", 10000, 512, 1024, instanceCount, "Test desctiption", 2);

    console.log("Lease Offer...");
    for (let i = 0; i < instanceCount; i++) {
        const buf = Buffer.from('BECF974A2C48C21F39046C1121E5DF7BD55648E1005172868CD5738C23E3C073', 'hex');
        buf.writeUInt32BE(i);
        await host.createOfferLease(2, buf.toString('hex'));
    }

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

async function acquire(scenario) {
    console.log(`-----------Acquire (${scenario})`);

    const user = await getUserClient();
    await user.prepareAccount();

    // Setup host to watch for incoming acquires.
    const host = await getHostClient();

    host.on(evernode.HostEvents.AcquireLease, async (r) => {
        console.log(`Host received acquire request: '${r.payload}'`);

        if (scenario !== "timeout") {
            console.log(`Host submitting ${scenario} response...`);
            await new Promise(resolve => setTimeout(resolve, 4000));

            if (scenario === "success")
                await host.acquireSuccess(r.acquireRefId, userAddress, { content: "dummy success" });
            else if (scenario === "error") {
                await host.burnOfferLease(r.nfTokenId);
                const buf = Buffer.from('BECF974A2C48C21F39046C1121E5DF7BD55648E1005172868CD5738C23E3C073', 'hex');
                buf.writeUInt32BE(Math.floor((Math.random() * 100) + 1));
                await host.createOfferLease(r.leaseAmount, buf.toString('hex'));
                await host.acquireError(r.acquireRefId, userAddress, r.leaseAmount, "dummy_error");
            }
        }
    })

    await fundUser(user);

    try {
        const timeout = (scenario === "timeout" ? 10000 : 30000);
        const result = await user.acquire(hostAddress, "dummy request", { timeout: timeout });
        console.log(`User received instance '${result.instance}'`);
    }
    catch (err) {
        console.log("User recieved acquire error: ", err.reason)
    }
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
    const lines = await user.xrplAcc.getTrustLines('EVR', evrIssuerAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 1) {
        await user.xrplAcc.setTrustLine('EVR', evrIssuerAddress, "99999999");
        await new evernode.XrplAccount(foundationAddress, foundationSecret).makePayment(userAddress, "1000", 'EVR', evrIssuerAddress);
    }
}

app();
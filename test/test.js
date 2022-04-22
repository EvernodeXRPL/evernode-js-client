// const evernode = require("evernode-js-client");
const evernode = require("../dist");  // Local dist dir. (use 'npm run build' to update)

const evrIssuerAddress = "ray8Ts3Eai2Qghman6PdNGYxq63K9iGqMW";
const registryAddress = "rGoxnVeLagXLBmeTkhYXYiEYMquz8QrWB8";
const registrySecret = "safBYXaiNZsPq3kHZ5BFNhYnp1PLW";
const hostAddress = "rnfndoYTFeSf6xc5kfuzHCAC2fbva5zk7e";
const hostSecret = "sn7k8nKy1dbc3LterSNm19sNAYU2W";
const foundationAddress = "rJqt24KdDrY2Dk7sSpCkRmC4rTMG3HeaNt";
const foundationSecret = "snsjv1cNCN36igTxpEGUAGkSVDQS8";
const tenantAddress = "rMWfKusKivyScqoybmLose9enQbD2Loa1G";
const tenantSecret = "spuU5nC3SxobhGAd81kXMUgWtky8W";

const tosHash = "BECF974A2C48C21F39046C1121E5DF7BD55648E1005172868CD5738C23E3C073";

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
        // await acc1.offerSellNft(nft.NFTokenID, '0', 'XRP', null, hostAddress);

        // // Account2: Buying party.
        // const acc2 = new evernode.XrplAccount(hostAddress, hostSecret);
        // // await acc2.offerBuyNft(nft.NFTokenID, registryAddress, '10', 'EVR', evrIssuerAddress);

        // // const offers = await acc1.getNftOffers();
        // // console.log(offers);
        // // Find the sellOffer information from seller's account.
        // const sellOffer = (await acc1.getNftOffers()).find(o => o.NFTokenID == nft.NFTokenID);
        // console.log(sellOffer);
        // // Buy the NFT by accepting the sell offer.
        // await acc2.buyNft(sellOffer.index);
        // // Get information about the purchased nft.
        // const nft2 = await acc2.getNftByUri(uri);
        // console.log(nft2);

        const tests = [
            // () => initializeConfigs(),
            () => registerHost(),
            // () => updateInfo(),
            // () => getAllHosts(),
            // () => getActiveHosts(),
            // () => heartbeatHost(),
            () => acquire("success"),
            // () => acquire("error"),
            // () => acquire("timeout"),
            // () => extendLease("success"),
            // () => extendLease("error"),
            // () => extendLease("timeout"),
            // () => deregisterHost(),
        ];

        for (const test of tests) {
            await test();
            await Promise.all(clients.map(c => c.disconnect())); // Cleanup clients after every test.
        }

        // await registerHost();
        // Accepting the sell offer created by registry.

        // const tokenID = '0008000083CD166E1806EF2076C55077AEFD418E771A516CB30E8CAE00000013';
        // const reg = new evernode.XrplAccount(registryAddress, registrySecret);
        // const sellOffer = (await reg.getNftOffers()).find(o => o.NFTokenID == tokenID);
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
        // Added this timeout since some tests failed with not connected error.
        await new Promise(resolve => setTimeout(resolve, 4000)); // Wait for four seconds before disconnecting.
        await xrplApi.disconnect();
    }
}

async function updateInfo() {
    const client = await getHostClient();
    await client.updateRegInfo(null, null, null, null, null, null, 10);
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
    const instanceCount = 1;
    await host.register("AU", 10000, 512, 1024, instanceCount, "Test desctiption", 2);

    console.log("Lease Offer...");
    for (let i = 0; i < instanceCount; i++)
        await host.offerLease(i, 2, tosHash);

    // Verify the registration.
    return await host.isRegistered();
}

async function deregisterHost(address = hostAddress, secret = hostSecret) {
    const host = await getHostClient(address, secret);

    if (!await host.isRegistered())
        return true;

    console.log(`-----------Deregister host`);

    await host.deregister();

    // Burn NFTs.
    const nfts = (await host.xrplAcc.getNfts()).filter(n => n.URI.startsWith(evernode.EvernodeConstants.LEASE_NFT_PREFIX_HEX))
        .map(o => { return { nfTokenId: o.NFTokenID, ownerAddress: host.xrplAcc.address }; });
    for (const nft of nfts) {
        const sold = nft.ownerAddress !== host.xrplAcc.address;
        await host.xrplAcc.burnNft(nft.nfTokenId, sold ? nft.ownerAddress : null);
        console.log(`Burnt ${sold ? 'sold' : 'unsold'} hosting NFT (${nft.nfTokenId}) of ${nft.ownerAddress + (sold ? ' tenant' : '')} account`);
    }

    // Verify the deregistration.
    return !await host.isRegistered();
}

async function heartbeatHost(address = hostAddress, secret = hostSecret) {
    const host = await getHostClient(address, secret);

    if (!await host.isRegistered())
        return true;

    console.log(`-----------Heartbeat host`);

    await host.heartbeat();
}

async function acquire(scenario) {
    console.log(`-----------Acquire (${scenario})`);

    const tenant = await getTenantClient();
    await tenant.prepareAccount();

    // Setup host to watch for incoming acquires.
    const host = await getHostClient();

    host.on(evernode.HostEvents.AcquireLease, async (r) => {
        console.log(`Host received acquire request: '${r.payload}'`);

        if (scenario !== "timeout") {
            console.log(`Host submitting ${scenario} response...`);
            await new Promise(resolve => setTimeout(resolve, 4000));

            if (scenario === "success")
                await host.acquireSuccess(r.acquireRefId, r.tenant, { content: "dummy success" });
            else if (scenario === "error") {
                const nft = (await (new evernode.XrplAccount(r.tenant)).getNfts())?.find(n => n.NFTokenID == r.nfTokenId);
                const leaseIndex = Buffer.from(nft.URI, 'hex').readUint16BE(evernode.EvernodeConstants.LEASE_NFT_PREFIX_HEX.length);

                await host.expireLease(r.nfTokenId, r.tenant);
                await host.offerLease(leaseIndex, r.leaseAmount, tosHash);
                await host.acquireError(r.acquireRefId, r.tenant, r.leaseAmount, "dummy_error");
            }
        }
    })

    await fundTenant(tenant);

    try {
        const timeout = (scenario === "timeout" ? 10000 : 30000);
        const result = await tenant.acquireLease(hostAddress, {
            container_name: "dc411912-bcdd-4f73-af43-32ec45844b9a",
            owner_pubkey: "ed06868b3dbc8f342eb10029bd8c11af6dfc4ce60be733a19cbb00ea11773081d6",
            contract_id: "dc411912-bcdd-4f73-af43-32ec45844b9a",
            image: "hp.latest-ubt.20.04",
            config: {}
        }, { timeout: timeout });
        console.log(`Tenant received instance '${result.instance}'`);
    }
    catch (err) {
        console.log("Tenant recieved acquire error: ", err.reason)
    }
}

async function extendLease(scenario) {
    console.log(`-----------Extend lease (${scenario})`);

    const tenant = await getTenantClient();
    await tenant.prepareAccount();

    // Setup host to watch for incoming acquires.
    const host = await getHostClient();

    host.on(evernode.HostEvents.ExtendLease, async (r) => {

        console.log(`Host received extend request for: '${r.nfTokenId}'`);

        console.log(`Host submitting ${scenario} response...`);
        await new Promise(resolve => setTimeout(resolve, 4000));

        if (scenario === "success")
            await host.extendSuccess(r.extendRefId, r.tenant, { content: "dummy success" }).catch(console.error);
        else if (scenario === "error") {
            await host.extendError(r.extendRefId, r.tenant, "dummy_error", r.payment.toString()).catch(console.error);
        }
    })

    await fundTenant(tenant);

    try {
        const timeout = (scenario === "timeout" ? 10000 : 30000);
        const tokenIDs = (await tenant.xrplAcc.getNfts()).map(n => n.NFTokenID);
        const result = await tenant.extendLease(hostAddress, 2, tokenIDs[0], { timeout: timeout });
        console.log(`Extend ref id: ${result.extendeRefId}, Expiry moments: ${result.expiryMoment}`);
    }
    catch (err) {
        console.log("Tenant recieved extend error: ", err.reason)
    }
}
//////////////////////////////////////////////////////////////////////////////////////

async function getTenantClient() {
    const client = new evernode.TenantClient(tenantAddress, tenantSecret);
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

async function fundTenant(tenant) {
    // Send hosting tokens to tenant if needed.
    const lines = await tenant.xrplAcc.getTrustLines('EVR', evrIssuerAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 1) {
        await tenant.xrplAcc.setTrustLine('EVR', evrIssuerAddress, "99999999");
        await new evernode.XrplAccount(foundationAddress, foundationSecret).makePayment(tenantAddress, "1000", 'EVR', evrIssuerAddress);
    }
}

app();
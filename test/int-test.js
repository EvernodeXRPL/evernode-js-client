const evernode = require("evernode-js-client");
// const evernode = require("../dist");  // Local dist dir. (use 'npm run build' to update)

const registryAddress = "rHQQq5aJ5kxFyNJXE36rAmuhxpDvpLHcWq";
const registrySecret = "sh6Wf4qXEXSu4H19kZgmj5y1pHdST";
const hostAddress = "rECDQFBeUBVbHUfsZx737FUZ2VSL1vPcb4";
const hostSecret = "sndg9x6sQ7Tf5A61BxpasAfksLHux";
const tenantAddress = "rDQM4GFeCBQ1kBbQVEJJooLmUFbjVbQWpa";
const tenantSecret = "ssnbB3w6RYZWNWsduy2U3d2ZGS2cp";

const foundationAddress = "r4Y4sqjYcVR79prqQkMRNrSjiGbsPgsHoB";
const foundationSecret = "sn3hfnq3yGe7bavsFJpSTzTHAsorN";
const evrIssuerAddress = "r3nfG81wwt2JWz8kK54KfBjUsNvJeXcnN6";


async function app() {

    // Use a singleton xrplApi for all tests.
    const xrplApi = new evernode.XrplApi();
    evernode.Defaults.set({
        registryAddress: registryAddress,
        xrplApi: xrplApi
    })

    try {
        await xrplApi.connect();

        // const regClient = await getRegistryClient();
        // console.log(await regClient.getConfigs())
        // console.log(await regClient.config)

        // const hostClient = await getHostClient();
        // const nfts = await hostClient.xrplAcc.getNfts();
        // console.log(nfts.length);
        // const leaseNfts = nfts.filter(n => n.URI.startsWith(evernode.EvernodeConstants.LEASE_NFT_PREFIX_HEX));
        // console.log(leaseNfts)

        // const offers = await hostClient.xrplAcc.getNftOffers();
        // console.log(offers.length);
        // const leaseOffers = offers.filter(o => leaseNfts.map(l => l.NFTokenID).includes(o.NFTokenID))
        // console.log(leaseOffers)

        // await getAllHosts();

        // await getActiveHosts()

        // const hostClient = await getHostClient();
        // console.log(await hostClient.getRegistration())

        await acquire();
        // await extendLease('0001000091A698F373FF9E5A2C962BF523D2A1A2071B8BFB2DCBAB9D00000002', 10);

        // const tenantClient = await getTenantClient();
        // const nfts = await tenantClient.xrplAcc.getNfts();
        // console.log(nfts.length);
        // const leaseNfts = nfts.filter(n => n.Issuer === hostAddress && n.URI.startsWith(evernode.EvernodeConstants.LEASE_NFT_PREFIX_HEX));
        // console.log(leaseNfts.sort((a, b) => { return a.nft_serial - b.nft_serial; }))

        // const registryClient = await getRegistryClient();
        // const nfts = await registryClient.xrplAcc.getNfts();
        // console.log(nfts)

        // const hostClient = await getHostClient();
        // const hnfts = await hostClient.xrplAcc.getNfts();
        // console.log(hnfts)
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

async function acquire() {
    const tenant = await getTenantClient();
    await tenant.prepareAccount();

    await fundTenant(tenant);

    try {
        const result = await tenant.acquireLease(hostAddress, {
            "owner_pubkey": "ed5cb83404120ac759609819591ef839b7d222c84f1f08b3012f490586159d2b50",
            "contract_id": "3c349abe-4d70-4f50-9fa6-018f1f2530ab",
            "image": "hp.latest-ubt.20.04-njs.16",
            "config": {}
        }, {timeout: 180000});
        console.log('Tenant received instance ', result.instance);
    }
    catch (err) {
        console.log("Tenant recieved acquire error: ", err.reason)
    }
}

async function extendLease(instanceName, moments) {
    const tenant = await getTenantClient();
    await tenant.prepareAccount();

    await fundTenant(tenant);

    try {
        const result = await tenant.extendLease(hostAddress, moments, instanceName);
        console.log(`Extend ref id: ${result.extendeRefId}, Expiry moments: ${result.expiryMoment}`);
    }
    catch (err) {
        console.log("Tenant recieved extend error: ", err.reason)
    }
}

async function getTenantClient() {
    const client = new evernode.TenantClient(tenantAddress, tenantSecret);
    await client.connect();
    return client;
}

async function getHostClient(address = hostAddress, secret = hostSecret) {
    const client = new evernode.HostClient(address, secret);
    await client.connect();
    return client;
}

async function getRegistryClient() {
    const client = new evernode.RegistryClient(registryAddress);
    await client.connect();
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
// const evernode = require("evernode-js-client");
const evernode = require("../dist");  // Local dist dir. (use 'npm run build' to update)
const codec = require('ripple-address-codec');

const evrIssuerAddress = "rDVFatp11HCrH4CjTbUs1CPZmPkUfmUYvC";
const registryAddress = "rhHdqek8JRvVSTfQ1vqRJsEU2qaG13vsGs";
const governorAddress = 'r9MxatdSbzRrrKJsnc39T7TbCrTSUPMbzW';
const heartbeatAddress = 'r4esPajrQFHpeDadFzQ8w7gFqXcvAkwNpN';
const hostAddress = "rDTgb4cJ5PvdeoXwZR1wLqiraFw65L4ePa";
const hostSecret = "ss4jvoC2ZfCJENJuTswGAxz41cBgN";
const foundationAddress = "rn5weEGQ9vzEh8rzNomosXeh88FWe1QLtj";
const foundationSecret = "shjp18HzrAksQbsUeZC7EJF2eFYPo";
const tenantAddress = "rw7GPreCDX2nuJVHSwNdH38ZGsiEH8qiY";
const tenantSecret = "shdQBGbF9d3Tgp3D28pXoBdhWoZ9N";
const initializerAddress = 'rMv668j9M6x2ww4HNEF4AhB8ju77oSxFJD';
const initializerSecret = 'sn6TNZivVQY9KxXrLy8XdH9oXk3aG';
const transfereeAddress = 'rNAW13zAUA4DjkM45peek3WhUs23GZ2fYD';
const multiSignerAddress = 'rsrpCr5j5phA58uQy9Ha3StMPBmSrXbVx6';
const multiSignerSecret = 'shYrpNBRgnej2xmBhxze75MNLfTwq';
const dudHostAddress = "rDTgb4cJ5PvdeoXwZR1wLqiraFw65L4ePa";
const dudHostSecret = "ss4jvoC2ZfCJENJuTswGAxz41cBgN";


const signerList = [
    {
        account: "rKqX6K3h43Wf1HT4hrpkpM92pf7DJAwFju",
        weight: 1
    },
    {
        account: "rGtN3sWmB84cVHqkPeEUngdwVZte9fH6Nn",
        weight: 1
    }
];

const signerQuorum = 1;


const tosHash = "757A0237B44D8B2BBB04AE2BAD5813858E0AECD2F0B217075E27E0630BA74314";

const hookCandidates = "B1727C4AB49BBE9DAFD568DA8ED8BE357EA5E3FFF87470D8167CD6BB5B9B1266FCC9D192CD7A6608A79F6193CC6741B2F03E3EF5DD54A7280E26AC116BD2195260921BF9632FBBA9F0E7329AAA6EF8B1C3E7C83F93DF265977B9391F86773113";

const clients = [];

async function app() {

    // Use a singleton xrplApi for all tests.
    const xrplApi = new evernode.XrplApi('wss://hooks-testnet-v2.xrpl-labs.com');
    evernode.Defaults.set({
        governorAddress: governorAddress,
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
            // () => getHookStates(),
            // () => registerHost(),
            // () => getHostInfo(),
            // () => updateInfo(),
            // () => getAllHosts(),
            // () => getActiveHosts(),
            // () => heartbeatHost(), // If not opted in for voting
            // () => heartbeatHost(evernode.EvernodeConstants.CandidateVote.Support),
            // () => heartbeatHost(evernode.EvernodeConstants.CandidateVote.Reject),
            // () => acquire("success"),
            // () => acquire("error"),
            // () => acquire("timeout"),
            // () => extendLease("success"),
            // () => extendLease("error"),
            // () => extendLease("timeout"),
            // () => deregisterHost(),
            // () => getAllConfigs(),
            // () => pruneDeadHost(),
            // () => transferHost(),
            // () => requestRebate(),
            // () => getAccountObjects(),
            // () => setSignerList(),
            // () => propose(),
            // () => foundationPropose(),
            // () => withdraw(),
            // () => foundationWithdraw(),
            // () => getCandidateInfo(),
            // () => getFoundationCandidateInfo(),
            // () => foundationVote(),
            // () => reportDudHost(),
            // () => voteDudHost(),
            // () => votePilotedMode(),
            // () => makePayment()

        ];

        for (const test of tests) {
            await test();
            await Promise.all(clients.map(c => c.disconnect())); // Cleanup clients after every test.
        }

        // await registerHost();
        // Accepting the sell offer created by registry.

        // const tokenID = '0008000083CD166E1806EF2076C55077AEFD418E771A516CB30E8CAE00000013';
        // const reg = new evernode.XrplAccount(registryAddress);
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
        // await getHookStates()

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
    console.log(`-----------Update host`);

    const client = await getHostClient();
    await client.updateRegInfo(10);
}

async function getActiveHosts() {
    console.log(`-----------Getting active hosts`);

    const regClient = await getRegistryClient();
    const hosts = await regClient.getActiveHosts();

    console.log("Hosts", hosts || "No active hosts");
}

async function initializeConfigs() {
    console.log(`-----------Initialize configs`);
    let memoData = Buffer.allocUnsafe(80);
    codec.decodeAccountID(evrIssuerAddress).copy(memoData);
    codec.decodeAccountID(foundationAddress).copy(memoData, 20);
    codec.decodeAccountID(registryAddress).copy(memoData, 40);
    codec.decodeAccountID(heartbeatAddress).copy(memoData, 60);

    const initAccount = new evernode.XrplAccount(initializerAddress, initializerSecret);
    await initAccount.makePayment(governorAddress, '1', 'XRP', null,
        [{ type: 'evnInitialize', format: 'hex', data: memoData.toString('hex') }]);
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
    const instanceCount = 2;
    await host.register("AU", 10000, 512, 1024, instanceCount, 'Intel', 10, 10, "Test desctiption", "testemail@gmail.com", 2);

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

async function heartbeatHost(vote = null, address = hostAddress, secret = hostSecret) {
    const host = await getHostClient(address, secret);

    if (!await host.isRegistered())
        return true;

    console.log(`-----------Heartbeat host`);
    (vote !== null) ? await host.heartbeat({ vote: vote, candidate: evernode.UtilHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex')) })
        : await host.heartbeat();
}

async function acquire(scenario) {
    console.log(`-----------Acquire (${scenario})`);

    const tenant = await getTenantClient();
    await tenant.prepareAccount();

    // Setup host to watch for incoming acquires.
    const host = await getHostClient();

    host.on(evernode.HostEvents.AcquireLease, async (r) => {
        console.log("Host received acquire request: ", r.payload);

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

    await fundAccount(tenant.xrplAcc, "1000");

    try {
        const timeout = (scenario === "timeout" ? 10000 : 30000);
        const result = await tenant.acquireLease(hostAddress, {
            owner_pubkey: "ed5cb83404120ac759609819591ef839b7d222c84f1f08b3012f490586159d2b50",
            contract_id: "dc411912-bcdd-4f73-af43-32ec45844b9a",
            image: "evernodedev/sashimono:hp.latest-ubt.20.04-njs.16",
            config: {}
        }, { timeout: timeout });
        console.log('Tenant received instance ', result.instance);
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

    await fundAccount(tenant.xrplAcc, "1000");

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

async function getTenantClient(address = tenantAddress, secret = tenantSecret) {
    const client = new evernode.TenantClient(address, secret);
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
    const client = await evernode.HookClientFactory.create(evernode.HookTypes.registry);
    await client.connect();
    clients.push(client);
    return client;
}

async function getBaseClient(address, secret) {
    const client = new evernode.BaseClient(address, secret);
    await client.connect();
    clients.push(client);
    return client;
}

async function fundAccount(account, amount) {
    const lines = await account.getTrustLines('EVR', evrIssuerAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < Number(amount)) {
        await account.setTrustLine('EVR', evrIssuerAddress, "99999999");
        await new evernode.XrplAccount(foundationAddress, foundationSecret).makePayment(account.address, amount, 'EVR', evrIssuerAddress);
    }
}

async function getHookStates() {
    const governorClient = await evernode.HookClientFactory.create(evernode.HookTypes.governor);
    await governorClient.connect();
    const states = await governorClient.getHookStates();
    console.log(states.length, states);
}

async function getAllHosts() {
    console.log(`-----------Getting all hosts (including inactive)`);
    const registryClient = await evernode.HookClientFactory.create(evernode.HookTypes.registry);
    await registryClient.connect();
    const hosts = await registryClient.getAllHosts();
    console.log(hosts.length, hosts);
}


async function getAllConfigs() {
    console.log(`-----------Getting all configs`);
    const governorClient = await evernode.HookClientFactory.create(evernode.HookTypes.governor);
    await governorClient.connect();
    const configs = await governorClient.getAllConfigs();
    console.log(configs.length, configs);
}

async function getHostInfo() {
    const host = await getHostClient();
    const hostInfo = await host.getHostInfo();
    console.log(hostInfo);
    return hostInfo;
}

async function pruneDeadHost(address = hostAddress) {
    console.log(`-----------Prune host`);

    // Create a cleint to send the prune request (the client can be a tenant or another host).
    const tenantClient = await getTenantClient();
    await tenantClient.pruneDeadHost(address);
}

async function transferHost(address = transfereeAddress) {

    const host = await getHostClient(hostAddress, hostSecret);

    if (!await host.isRegistered()) {
        console.log("Host is not registered.");
        return true;
    }

    console.log(`-----------Transfer host`);

    // Get EVRs from the foundation if needed.
    const lines = await host.xrplAcc.getTrustLines(evernode.EvernodeConstants.EVR, evrIssuerAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 1) {
        console.log("Transfer EVRs...");
        const foundationAcc = new evernode.XrplAccount(foundationAddress, foundationSecret);
        await foundationAcc.makePayment(hostAddress, "1", evernode.EvernodeConstants.EVR, evrIssuerAddress);
    }

    console.log("Initiating a transfer...");
    await host.transfer(address);

    // Burn NFTs.
    const nfts = (await host.xrplAcc.getNfts()).filter(n => n.URI.startsWith(evernode.EvernodeConstants.LEASE_NFT_PREFIX_HEX))
        .map(o => { return { nfTokenId: o.NFTokenID, ownerAddress: host.xrplAcc.address }; });
    for (const nft of nfts) {
        const sold = nft.ownerAddress !== host.xrplAcc.address;
        await host.xrplAcc.burnNft(nft.nfTokenId, sold ? nft.ownerAddress : null);
        console.log(`Burnt ${sold ? 'sold' : 'unsold'} hosting NFT (${nft.nfTokenId}) of ${nft.ownerAddress + (sold ? ' tenant' : '')} account`);
    }

}

async function requestRebate() {
    const host = await getHostClient(hostAddress, hostSecret);

    if (!await host.isRegistered()) {
        console.log("Host is not registered.");
        return true;
    }

    console.log(`-----------Request rebate`);
    await host.requestRebate();
}

async function getAccountObjects() {
    console.log(`-----------Getting account objects`);

    const registryAccount = new evernode.XrplAccount(governorAddress, null);
    let res = await registryAccount.getAccountObjects({});
    console.log(res);
}

async function setSignerList() {
    if (signerList.length < 1)
        throw ("Signer list is empty.")

    if (signerQuorum < 1)
        throw ("Signer quorum must be a positive integer.");

    console.log("-----------Setting signer list");
    const masterAccount = new evernode.XrplAccount(multiSignerAddress, multiSignerSecret);

    const res = await masterAccount.setSignerList(signerList, { signerQuorum: signerQuorum });
    console.log(res);
}

async function propose() {
    const host = await getHostClient(hostAddress, hostSecret);
    // First epoch reward quota is considered.
    await fundAccount(host.xrplAcc, "5120");

    if (!await host.isRegistered()) {
        console.log("Host is not registered.");
        return true;
    }

    console.log(`-----------Proposing hook candidate`);
    await host.propose(hookCandidates, 'testProposal');
}

async function foundationPropose() {
    const client = await getTenantClient(foundationAddress, foundationSecret);

    console.log(`-----------Foundation proposing hook candidate`);
    await client.propose(hookCandidates, 'testProposal');
}

async function getFoundationCandidateInfo() {
    const client = await getTenantClient(foundationAddress, foundationSecret);
    const candidateInfo = await client.getCandidateInfo();
    console.log(candidateInfo);
    return candidateInfo;
}

async function getCandidateInfo() {
    const host = await getHostClient();
    const candidateInfo = await host.getCandidateInfo();
    console.log(candidateInfo);
    return candidateInfo;
}

async function withdraw() {
    const host = await getHostClient(hostAddress, hostSecret);
    const uniqueId = evernode.UtilHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex'));

    if (!await host.isRegistered()) {
        console.log("Host is not registered.");
        return true;
    }

    console.log(`-----------Withdrawing hook candidate`);
    await host.withdraw(uniqueId);
}

async function foundationWithdraw() {
    const client = await getTenantClient(foundationAddress, foundationSecret);
    const uniqueId = evernode.UtilHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex'));

    console.log(`-----------Foundation Withdrawing hook candidate`);
    await client.withdraw(uniqueId);
}

async function foundationVote() {
    const client = await getTenantClient(foundationAddress, foundationSecret);
    const uniqueId = evernode.UtilHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex'));

    console.log(`-----------Foundation vote for hook candidate`);
    await client.vote(uniqueId, evernode.EvernodeConstants.CandidateVote.Support);
}

async function reportDudHost() {
    // Register the dud host.
    console.log("Registering the dud host...");
    await registerHost(dudHostAddress, dudHostSecret);

    const client = await getHostClient();

    console.log(`-----------Reporting dud host`);
    await client.reportDudHost(dudHostAddress);
}

async function voteDudHost() {
    const client = await getHostClient();

    console.log(`-----------Voting for dud host`);
    await client.voteDudHost(dudHostAddress, evernode.EvernodeConstants.CandidateVote.Support);
}

async function votePilotedMode() {
    const client = await getHostClient();

    console.log(`-----------Voting for piloted mode`);
    await client.votePilotedMode(evernode.EvernodeConstants.CandidateVote.Support);
}

async function makePayment() {
    const tenant = new evernode.XrplAccount(tenantAddress, tenantSecret);
    console.log("-----------Simple payment");
    const res = await tenant.makePayment(governorAddress, "1", "EVR", evrIssuerAddress,
        [{ type: 'evnTest', format: evernode.MemoFormats.TEXT, data: 'Test Data' }]);
    console.log(res);
}

app();
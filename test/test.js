// const evernode = require("evernode-js-client");
const evernode = require("../dist");  // Local dist dir. (use 'npm run build' to update)
const codec = require('ripple-address-codec');

const evrIssuerAddress = "rszpt6nQmGZsXD4MoYVCbfCwYFPgbcq2Md";
const registryAddress = "rBjgZ7uxUVtopfLE7ou1jPdPTxU3gRCeYp";
const governorAddress = 'r3DzWozd3CCvkBjCFzsvRNBLcYD11hoJzG';
const heartbeatAddress = 'rnaJfKxnjcNk88fKZ4SM59qqz3xpUn2Jwp';
const hostAddress = "rESDJA9HFfd6SUEwtQjhStD5ZhPGPt4nMJ";
const hostSecret = "shmTU3sMshnrCSTm7BGkKutD4p2AC";
const foundationAddress = "r4L7Z8TnwLyQcAqAXP9GzyL9dsHA8tGWSo";
const foundationSecret = "snjCbzpwRojsMwiD2SJxjG3bTy7QM";
const tenantAddress = "r41xYGU6FHJ4vKiXPBm1BGrijL6zjcdp5D";
const tenantSecret = "shXiekLBdkxpv5hFBDEmUFqDUjaKU";
const initializerAddress = 'rMv668j9M6x2ww4HNEF4AhB8ju77oSxFJD';
const initializerSecret = 'sn6TNZivVQY9KxXrLy8XdH9oXk3aG';
const transfereeAddress = 'rMukZHU1BGWbEkdbXZtF3Tf6Epf2Pj1DRA';
const transfereeSecret = 'ss9ZB8ncuMh6KLtFdZBp9gMv9rRPN';
const multiSigninerAddress = 'rsrpCr5j5phA58uQy9Ha3StMPBmSrXbVx6';
const multiSignerSecret = 'shYrpNBRgnej2xmBhxze75MNLfTwq';
const dudHostAddress = "rBDjYjqVdqXCxeyTHPDRfBN3HiySjcSSdj";
const dudHostSecret = "sn6RrMDTFvL5XGR6GoTNR3ZdnkMFj";


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

const hookCandidates = "35A04AB81692C2C1A618D4B9DB0D22F7FFA8DAD202D4A38F573EC3312FE5976D071948DB5B9B92331104C51E5062694E28F6B192A89D8CB8B80A2A7424829005D97647A442742D0ED69F65832B3BD7F002F35E3405B3406FCAC83634B06B8EC1";

const clients = [];

async function app() {

    // Use a singleton xrplApi for all tests.
    const xrplApi = new evernode.XrplApi('wss://hooks-testnet-v3.xrpl-labs.com');
    evernode.Defaults.set({
        governorAddress: governorAddress,
        xrplApi: xrplApi,
        networkID: 21338
    })

    try {
        await xrplApi.connect();

        /*
         * Process of minting and selling a NFT - V2.
         */

        // Account1: selling party.
        // const acc1 = new evernode.XrplAccount(tenantAddress, tenantSecret);
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

        // Process of minting and selling a URI token.

        // Account1: selling party.
        // const acc1 = new evernode.XrplAccount(hostAddress, hostSecret);
        // // Mint a token with some data included in uri. uri should be unique.
        // const uri = "myuritoken custom data 14";
        // await acc1.mintURIToken(uri, null, { isBurnable: true });
        // // Get the minted uri token information and sell it on the dex.
        // let token = await acc1.getURITokenByUri(uri);
        // console.log(token);
        // // Make a sell offer min drops while restricting it to be only purchased by the specified party.
        // await acc1.sellURIToken(token.index, '1', 'XRP', null, tenantAddress);

        // // Account2: Buying party.
        // token = await acc1.getURITokenByUri(uri);
        // const acc2 = new evernode.XrplAccount(tenantAddress, tenantSecret);
        // await acc2.buyURIToken(token);

        // // Account1: burning uri token.
        // await acc1.burnURIToken(token.index);

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
            // () => foundationVote(),
            // () => reportDudHost(),
            // () => foundationReportDudHost(),
            // () => voteDudHost(),
            // () => foundationVoteDudHost(),
            // () => votePilotedMode(),
            // () => foundationVotePilotedMode(),
            // () => changeGovernanceMode(),
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

    // Burn tokens.
    const tokens = (await host.xrplAcc.getURITokens()).filter(n => evernode.EvernodeHelpers.isValidURI(n.URI, evernode.EvernodeConstants.LEASE_TOKEN_PREFIX_HEX) && n.Issuer === host.xrplAcc.address)
        .map(o => { return { uriTokenId: o.index, ownerAddress: o.Owner }; });
    for (const token of tokens) {
        const sold = token.ownerAddress !== host.xrplAcc.address;
        await host.xrplAcc.burnURIToken(token.uriTokenId);
        console.log(`Burnt ${sold ? 'sold' : 'unsold'} hosting token (${token.uriTokenId}) of ${token.ownerAddress + (sold ? ' tenant' : '')} account`);
    }

    // Verify the deregistration.
    return !await host.isRegistered();
}

async function heartbeatHost(vote = null, address = hostAddress, secret = hostSecret) {
    const host = await getHostClient(address, secret);

    if (!await host.isRegistered())
        return true;

    console.log(`-----------Heartbeat host`);
    (vote !== null) ? await host.heartbeat({ vote: vote, candidate: evernode.StateHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex')) })
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
                const uriToken = (await (new evernode.XrplAccount(r.tenant)).getURITokens())?.find(n => n.index == r.uriTokenId);
                const leaseIndex = (evernode.UtilHelpers.decodeLeaseTokenUri(uriToken.URI)).leaseIndex;

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

        console.log(`Host received extend request for: '${r.uriTokenId}'`);

        console.log(`Host submitting ${scenario} response...`);
        await new Promise(resolve => setTimeout(resolve, 4000));

        if (scenario === "success")
            await host.extendSuccess(r.extendRefId, r.tenant, Math.floor(r.payment / 2), { content: "dummy success" }).catch(console.error);
        else if (scenario === "error") {
            await host.extendError(r.extendRefId, r.tenant, "dummy_error", r.payment.toString()).catch(console.error);
        }
    })

    await fundAccount(tenant.xrplAcc, "1000");

    try {
        const timeout = (scenario === "timeout" ? 10000 : 30000);
        const tokenIDs = (await tenant.xrplAcc.getURITokens()).map(n => n.index);
        const result = await tenant.extendLease(hostAddress, 2, tokenIDs[0], { timeout: timeout });
        console.log(`Extend ref id: ${result.extendRefId}, Expiry moments: ${result.expiryMoment}`);
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

async function getFoundationClient(address = foundationAddress, secret = foundationSecret) {
    const client = new evernode.FoundationClient(address, secret);
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
    await host.transfer(address);

    // Burn tokens.
    const tokens = (await host.xrplAcc.getURITokens()).filter(n => evernode.EvernodeHelpers.isValidURI(n.URI, evernode.EvernodeConstants.LEASE_TOKEN_PREFIX_HEX) && n.Issuer === host.xrplAcc.address)
        .map(o => { return { uriTokenId: o.index, ownerAddress: o.Owner }; });
    for (const token of tokens) {
        const sold = token.ownerAddress !== host.xrplAcc.address;
        await host.xrplAcc.burnURIToken(token.uriTokenId);
        console.log(`Burnt ${sold ? 'sold' : 'unsold'} hosting token (${token.uriTokenId}) of ${token.ownerAddress + (sold ? ' tenant' : '')} account`);
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

    console.log(`-----------Proposing hook candidate`);
    await host.propose(hookCandidates, 'testProposal');
}

async function foundationPropose() {
    const client = await getFoundationClient(foundationAddress, foundationSecret);

    console.log(`-----------Foundation proposing hook candidate`);
    await client.propose(hookCandidates, 'testProposal');
}

async function reportDudHost() {
    // Register the dud host.
    console.log("Registering the dud host...");
    await registerHost(dudHostAddress, dudHostSecret).catch(console.error);

    const client = await getHostClient(hostAddress, hostSecret);

    console.log(`-----------Reporting dud host`);
    await client.reportDudHost(dudHostAddress);
}

async function foundationReportDudHost() {
    // Register the dud host.
    console.log("Registering the dud host...");
    await registerHost(dudHostAddress, dudHostSecret).catch(console.error);

    const client = await getFoundationClient(foundationAddress, foundationSecret);

    console.log(`-----------Foundation reporting dud host`);
    await client.reportDudHost(dudHostAddress);
}

async function getCandidateInfo(owner = hostAddress) {
    const host = await getHostClient(hostAddress, hostSecret);
    const candidateInfo = await host.getCandidateInfo(owner);
    console.log(candidateInfo);
    return candidateInfo;
}

async function withdraw() {
    const host = await getHostClient(hostAddress, hostSecret);
    const uniqueId = evernode.StateHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex'));

    console.log(`-----------Withdrawing hook candidate`);
    await host.withdraw(uniqueId);
}

async function foundationWithdraw() {
    const client = await getFoundationClient(foundationAddress, foundationSecret);
    const uniqueId = evernode.StateHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex'));

    console.log(`-----------Foundation Withdrawing hook candidate`);
    await client.withdraw(uniqueId);
}

async function foundationVote(vote = evernode.EvernodeConstants.CandidateVote.Support) {
    const client = await getFoundationClient(foundationAddress, foundationSecret);
    const uniqueId = evernode.StateHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex'));

    console.log(`-----------Foundation vote for hook candidate`);
    await client.vote(uniqueId, vote);
}

async function voteDudHost(vote = evernode.EvernodeConstants.CandidateVote.Support) {
    const client = await getHostClient(hostAddress, hostSecret);
    const uniqueId = evernode.StateHelpers.getDudHostCandidateId(dudHostAddress);

    console.log(`-----------Voting for dud host`);
    await await client.heartbeat({ vote: vote, candidate: uniqueId });
}

async function foundationVoteDudHost(vote = evernode.EvernodeConstants.CandidateVote.Support) {
    const client = await getFoundationClient(foundationAddress, foundationSecret);

    console.log(`-----------Foundation vote for dud host`);
    await client.voteDudHost(dudHostAddress, vote);
}

async function votePilotedMode(vote = evernode.EvernodeConstants.CandidateVote.Support) {
    const client = await getHostClient(hostAddress, hostSecret);
    const uniqueId = evernode.StateHelpers.getPilotedModeCandidateId();

    console.log(`-----------Voting for piloted mode`);
    await await client.heartbeat({ vote: vote, candidate: uniqueId });
}

async function foundationVotePilotedMode(vote = evernode.EvernodeConstants.CandidateVote.Support) {
    const client = await getFoundationClient(foundationAddress, foundationSecret);

    console.log(`-----------Foundation vote for piloted mode`);
    await client.votePilotedMode(vote);
}

async function changeGovernanceMode(mode = evernode.EvernodeConstants.GovernanceModes.CoPiloted) {
    const client = await getFoundationClient(foundationAddress, foundationSecret);

    console.log(`-----------Changing the governor mode`);
    await client.changeGovernanceMode(mode);
}

async function makePayment() {
    const tenant = new evernode.XrplAccount(tenantAddress, tenantSecret);
    console.log("-----------Simple payment");
    const res = await tenant.makePayment(governorAddress, "1", "EVR", evrIssuerAddress,
        [{ type: 'evnTest', format: evernode.MemoFormats.TEXT, data: 'Test Data' }]);
    console.log(res);
}

app();
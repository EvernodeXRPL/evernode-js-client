const evernode = require("evernode-js-client");
const codec = require('ripple-address-codec');

let governorAddress;
let evrIssuerAddress;
let foundationAddress;
let registryAddress;
let heartbeatAddress;
const overrideGovernorAddress = '';
const foundationSecret = "sn3nNMSuyXiqVjrhfQr9JxDhgHmds";
const initializerAddress = 'rMv668j9M6x2ww4HNEF4AhB8ju77oSxFJD';
const initializerSecret = 'sn6TNZivVQY9KxXrLy8XdH9oXk3aG';
const hostAddress = "rpRcrjaM3bMc7KM3qVkMTMsLTpV8LhHhTq";
const hostSecret = "snGKAK7wMqXf47pxnh2hZ56k3nx6q";
const hostReputationAddress = "r3kDibZG3xoKFLPGU3hL116TjVhjEmcnsp";
const hostReputationSecret = "ssMmi4o2wHR76f23b1eiCePoauecH";
const tenantAddress = "r3vbdktYDxVSe7K1oo2McKeBJhQng3uFeH";
const tenantSecret = "shjBr5yFDNzyUkBiFXjexFYiAsPBS";
const transfereeAddress = 'rsPxbXNo5XnBpnLZ3yu3ZufCZiA22hS5R7';
const transfereeSecret = 'snXTbrMTJ64MALdMv56b2p7FoBQTw';
const multiSignerAddress = 'rN7MCSD6xTkdXnD94Q2YJjTmcwVSbkwiDL';
const multiSignerSecret = 'sn5VhmQreHjFTadZqMYx7m1tE9JAx';
const dudHostAddress = "rGTGBxN2ABeLjxveHXFCU5V8uqfoDEUJLB";
const dudHostSecret = "shCGdyvmpj3bJPFgYWLt8N55Cgf8S";
const signerOneAddress = "rshF5zDNaR5jiyWMkK9qqHPuR5susDdCrW";
const signerOneSecret = "shkEQpH63R9KW8v5EHfibBQ8wACdQ";
const signerTwoAddress = "rQL7pzkQkdB5jV7Big6QSNZdzeT6zZQXHU";
const signerTwoSecret = "sptkPWTDoqrnP1LNAHx47wM6ssjY2";

const hostReputationValue = 200;

const signerList = [
    {
        account: signerOneAddress,
        weight: 1
    },
    {
        account: signerTwoAddress,
        weight: 1
    }
];

const signerQuorum = 1;


const tosHash = "757A0237B44D8B2BBB04AE2BAD5813858E0AECD2F0B217075E27E0630BA74314";

const hookCandidates = "E2F7D833DF05EE69C6F4244F2E6C9B9D2745EAD1EC7503FA2B5102E24DA2C6F91ADCDEF05B87BC22565647A2676B9961DD75C20212BE9E98E7A7EBC8A9BCF72B33BDC163ACFFE34EDE3C607DDF295B239A0A3C0506372072B370DB3786359938";

const clients = [];

async function app() {

    // Use a singleton xrplApi for all tests.
    await evernode.Defaults.useNetwork('devnet');
    const xrplApi = new evernode.XrplApi(null, { autoReconnect: true });
    evernode.Defaults.set({
        xrplApi: xrplApi
    });
    if (overrideGovernorAddress)
        evernode.Defaults.set({
            governorAddress: overrideGovernorAddress
        });
    governorAddress = evernode.Defaults.values.governorAddress;

    try {
        await xrplApi.connect();

        const governorClient = await evernode.HookClientFactory.create(evernode.HookTypes.governor);
        await governorClient.connect();
        evrIssuerAddress = governorClient.config.evrIssuerAddress;
        foundationAddress = governorClient.config.foundationAddress;
        registryAddress = governorClient.config.registryAddress;
        heartbeatAddress = governorClient.config.heartbeatAddress;

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
        // await acc1.offerSellNft(nft.NFTokenID, '0', null, null, hostAddress);

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
        // await acc1.sellURIToken(token.index, '1', null, null, tenantAddress);

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
            // () => prepareHostReputation(),
            // () => getReputationInfo(),
            // () => sendReputation(),
            // () => getHostInfo(),
            // () => updateInfo(),
            // () => getAllHostsFromLedger(),
            // () => getActiveHostsFromLedger(),
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
            // () => pruneDeadHost(),
            // () => transferHost(),
            // () => requestRebate(),
            // () => getAccountObjects(),
            // () => setSignerList(),
            // () => propose(),
            // () => foundationPropose(),
            // () => withdraw(),
            // () => foundationWithdraw(),
            // () => getCandidateByOwner(),
            // () => getCandidateById(),
            // () => foundationVote(),
            // () => reportDudHost(),
            // () => withdrawDudHost(),
            // () => getDudHostVoteInfo(),
            // () => foundationReportDudHost(),
            // () => foundationWithdrawDudHost(),
            // () => voteDudHost(),
            // () => foundationVoteDudHost(),
            // () => getPilotedModeVoteInfo(),
            // () => votePilotedMode(),
            // () => foundationVotePilotedMode(),
            // () => changeGovernanceMode(evernode.EvernodeConstants.GovernanceModes.AutoPiloted),
            // () => makePayment(),
            // () => getDudHostCandidatesByOwner(),
            // () => multiSignedMakePayment(),
            // () => updateHostReputation(),

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
    await client.updateRegInfo(10, null, 3, null, null, null, null, null, null, null, 0.001);
}

async function getActiveHostsFromLedger() {
    console.log(`-----------Getting active hosts from ledger`);

    const regClient = await getRegistryClient();
    const hosts = await regClient.getActiveHostsFromLedger();

    console.log("Hosts", hosts || "No active hosts");
}

async function initializeConfigs() {
    console.log(`-----------Initialize configs`);
    let paramData = Buffer.alloc(80, 0);
    codec.decodeAccountID(evrIssuerAddress).copy(paramData);
    codec.decodeAccountID(foundationAddress).copy(paramData, 20);
    codec.decodeAccountID(registryAddress).copy(paramData, 40);
    codec.decodeAccountID(heartbeatAddress).copy(paramData, 60);

    const initAccount = new evernode.XrplAccount(initializerAddress, initializerSecret);
    await initAccount.makePayment(
        governorAddress,
        '1',
        null,
        null,
        null,
        {
            hookParams: [
                { name: evernode.HookParamKeys.PARAM_EVENT_TYPE_KEY, value: 'evnInitialize' },
                { name: evernode.HookParamKeys.PARAM_EVENT_DATA_KEY, value: paramData.toString('hex') }
            ]
        });
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
    if (lines.length === 0 || parseInt(lines[0].balance) < 500) {
        console.log("Transfer EVRs...");
        const foundationAcc = new evernode.XrplAccount(foundationAddress, foundationSecret);
        await foundationAcc.makePayment(address, "500", evernode.EvernodeConstants.EVR, evrIssuerAddress);
    }

    const leaseAmount = 0.000001;

    console.log("Register...");
    const instanceCount = 3;
    await host.register("AU", 10000, 512, 1024, instanceCount, 'Intel', 10, 10, "Test desctiption", "testemail@gmail.com", leaseAmount);

    console.log("Lease Offer...");
    for (let i = 0; i < instanceCount; i++) {
        let x = 7000 + i;
        await host.offerLease(i, leaseAmount, tosHash, `2001:0db8:85a3:0000:0000:8a2e:0370:${x}`);
    }

    // Verify the registration.
    return await host.isRegistered();
}

async function prepareHostReputation(address = hostAddress, secret = hostSecret, reputationAddress = hostReputationAddress, reputationSecret = hostReputationSecret) {
    const host = await getHostClient(address, secret);

    if (!await host.isRegistered())
        return;

    console.log(`-----------Prepare host reputation`);
    await host.prepareReputationAccount(reputationAddress, reputationSecret);
    return;
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
                const decodedToken = evernode.UtilHelpers.decodeLeaseTokenUri(uriToken.URI);
                const leaseIndex = decodedToken.leaseIndex;
                const outboundIP = decodedToken.outboundIP;

                await host.expireLease(r.nfTokenId, r.tenant);
                await host.offerLease(leaseIndex, r.leaseAmount, tosHash, outboundIP);
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
            image: "evernodedev/sashimono:hp.latest-ubt.20.04-njs.20",
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
        const tokenIDs = (await tenant.xrplAcc.getURITokens()).filter(uriToken => evernode.EvernodeHelpers.isValidURI(uriToken.URI, evernode.EvernodeConstants.LEASE_TOKEN_PREFIX_HEX)).map(n => n.index);
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

async function getAllHostsFromLedger() {
    console.log(`-----------Getting all hosts from ledger (including inactive)`);
    const registryClient = await evernode.HookClientFactory.create(evernode.HookTypes.registry);
    await registryClient.connect();
    const hosts = await registryClient.getAllHostsFromLedger(true);
    console.log(hosts.length, hosts);
}

async function getHostInfo() {
    const host = await getHostClient();
    const hostInfo = await host.getHostInfo();
    console.log(hostInfo);
    return hostInfo;
}

async function getReputationInfo() {
    const host = await getHostClient();
    const reputationInfo = await host.getReputationInfo();
    console.log(reputationInfo);
    return reputationInfo;
}

async function sendReputation() {
    const host = await getHostClient(hostAddress, hostSecret, hostReputationAddress, hostReputationSecret);

    console.log(`Sending reputation`);

    await host.sendReputations({});
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
    // First epoch reward quota is considered.
    await fundAccount(client.xrplAcc, "5120");

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

async function withdrawDudHost() {
    const host = await getHostClient(hostAddress, hostSecret);
    const uniqueId = evernode.StateHelpers.getDudHostCandidateId(dudHostAddress);

    console.log(`-----------Withdrawing dud host candidate`);
    await host.withdraw(uniqueId);
}

async function foundationWithdrawDudHost() {
    const client = await getFoundationClient(foundationAddress, foundationSecret);
    const uniqueId = evernode.StateHelpers.getDudHostCandidateId(dudHostAddress);

    console.log(`-----------Foundation Withdrawing dud host candidate`);
    await client.withdraw(uniqueId);
}

async function getCandidateByOwner(owner = hostAddress) {
    const host = await getHostClient(hostAddress, hostSecret);
    const candidateInfo = await host.getCandidateByOwner(owner);
    console.log(candidateInfo);
    return candidateInfo;
}

async function getDudHostCandidatesByOwner(owner = hostAddress) {
    const host = await getHostClient(hostAddress, hostSecret);
    const candidatesInfo = await host.getDudHostCandidatesByOwner(owner);
    console.log(candidatesInfo);
    return candidatesInfo;
}

async function getCandidateById() {
    const host = await getHostClient(hostAddress, hostSecret);
    const uniqueId = evernode.StateHelpers.getNewHookCandidateId(Buffer.from(hookCandidates, 'hex'));
    const candidateInfo = await host.getCandidateById(uniqueId);
    console.log(candidateInfo);
    return candidateInfo;
}

async function getDudHostVoteInfo(dudHost = dudHostAddress) {
    const host = await getHostClient(dudHost);
    const candidateInfo = await host.getDudHostVoteInfo();
    console.log(candidateInfo);
    return candidateInfo;
}

async function getPilotedModeVoteInfo() {
    const host = await getHostClient(hostAddress, hostSecret);
    const candidateInfo = await host.getPilotedModeVoteInfo();
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
        [{ type: 'evnTest', format: 'text/plain', data: 'Test Data' }],
        {
            hookParams: [
                { name: '546573744E616D65', value: '5465737456616C7565' }
            ]
        });
    console.log(res);
}

async function multiSignedMakePayment() {
    console.log("-----------Multi-Signed payment");
    const multiSig = new evernode.XrplAccount(multiSignerAddress, multiSignerSecret);

    await fundAccount(multiSig, '1');

    let transaction = await multiSig.prepareMakePayment(governorAddress, "1", "EVR", evrIssuerAddress,
        [{ type: 'evnTest', format: 'text/plain', data: 'Test Data' }],
        {
            hookParams: [
                { name: '546573744E616D65', value: '5465737456616C7565' }
            ]
        });

    // Create signer accounts.
    const acc1 = new evernode.XrplAccount(signerOneAddress, signerOneSecret);
    const acc2 = new evernode.XrplAccount(signerTwoAddress, signerTwoSecret);

    // Prepare Fee.
    transaction.Fee = `${transaction.Fee * (2 + 2)}`;

    // Signing transaction.
    const signedTx1 = await acc1.sign(transaction, true);
    const signedTx2 = await acc2.sign(transaction, true);

    // Appending signatures.
    let decodedTx = JSON.parse(JSON.stringify(acc1.xrplApi.xrplHelper.decode(signedTx1.tx_blob)));
    let signature1 = decodedTx.Signers[0];

    decodedTx = JSON.parse(JSON.stringify(acc2.xrplApi.xrplHelper.decode(signedTx2.tx_blob)));
    let signature2 = decodedTx.Signers[0];

    transaction.Signers = [signature1, signature2];

    // Submit transaction.
    const res = await multiSig.submitMultisigned(transaction);
    console.log(res)
}

async function updateHostReputation(address = hostAddress) {
    console.log(`-----------Host reputation update`);

    const foundationClient = await getFoundationClient();
    await foundationClient.updateHostReputation(address, hostReputationValue);
}

app().catch(console.error);
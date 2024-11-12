const evernode = require("evernode-js-client");
const xrpl = require('xrpl');
const fs = require('fs');
const https = require('https');

let evrIssuerAddress;
let foundationAddress;
const overrideGovernorAddress = '';
const foundationSecret = "";

const tosHash = "757A0237B44D8B2BBB04AE2BAD5813858E0AECD2F0B217075E27E0630BA74314";
const COUNT = 10;

const candidateIds = [];

let genTime = 0;
let generating = false;

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

        const filePath = "hosts.json";
        let hostList = fs.existsSync(filePath) ? JSON.parse(fs.readFileSync(filePath)) : [];
        console.log('Hosts loaded:', hostList.length);

        if (process.argv[2] === "prep") {
            let hosts = {};
            const count = process.argv[3] ? parseInt(process.argv[3]) : COUNT;
            await Promise.all(Array.from({ length: count }, (_, i) => i).map(async (id) => {
                await new Promise(solve => setTimeout(solve, 200 * id));
                try {
                    const info = await createHost();
                    if (info)
                        hosts[id.toString()] = info;
                }
                catch (e) {
                    console.error(e);
                }
            }));
            hostList.push(...Object.entries(hosts).map(e => e[1]));
            fs.writeFileSync(filePath, JSON.stringify(hostList, null, 2));
        }
        else if (process.argv[2] === "len") {
            console.log('Host count : ', hostList.length);
        }
        else if (process.argv[2] === "rep") {
            const tail = process.argv[3] ? hostList.length - parseInt(process.argv[3]) : null;
            const list = tail ? hostList.splice(tail) : hostList;
            await Promise.all(list.map(async (host, i) => {
                await new Promise(solve => setTimeout(solve, 5000 * i));
                await startHostReputationSender(host.host.address, host.host.secret, host.reputation.address, host.reputation.secret, hostList).catch(console.error);
            }));
            console.log('Host reputations sent.');
        }
        else if (process.argv[2] === "hb") {
            const tail = process.argv[3] ? hostList.length - parseInt(process.argv[3]) : null;
            const list = tail ? hostList.splice(tail) : hostList;
            await Promise.all(list.map(async (host, i) => {
                await new Promise(solve => setTimeout(solve, 5000 * i));
                await startHostHeartbeatSender(host.host.address, host.host.secret, i).catch(console.error);
            }));
            console.log('Host heartbeat sent.');
        }
        else if (process.argv[2] === "order") {
            let orders = {};
            await Promise.all(hostList.map(async (host, i) => {
                const hostClient = new evernode.HostClient(host.host.address, host.host.secret);
                await hostClient.connect({ reputationAddress: host.reputation.address, reputationSecret: host.reputation.secret });
                const info = await hostClient.getReputationInfo();
                orders[i.toString()] = info?.orderedId;
                await hostClient.disconnect();
            }));
            const res = Object.entries(orders).map(o => o[1]).sort((a, b) => a - b);
            let errorIndexes = [];
            for (let i = 0; i < res.length; i++) {
                if (!res.includes(i))
                    errorIndexes.push(i);
            }
            if (errorIndexes.length > 0)
                console.log(`No orderedId for ${errorIndexes.join(', ')}. Len ${res.length}`);
            else
                console.log(`Ordered without an issue. Len ${res.length}`);
        }
        else if (process.argv[2] === "info") {
            const reputationClient = await evernode.HookClientFactory.create(evernode.HookTypes.reputation);
            await reputationClient.connect();
            const moment = await reputationClient.getMoment();
            await reputationClient.disconnect();
            let repInfos = {};
            await Promise.all(hostList.map(async (host, i) => {
                try {
                    const hostClient = new evernode.HostClient(host.host.address, host.host.secret);
                    await hostClient.connect({ reputationAddress: host.reputation.address, reputationSecret: host.reputation.secret });
                    const repInfo = {};//await hostClient.getReputationInfo(moment + 1);
                    const hostInfo = await hostClient.getRegistration();
                    repInfos[i.toString()] = {
                        lastHeartbeatMoment: await hostClient.getMoment(hostInfo?.lastHeartbeatIndex),
                        reputation: hostInfo?.hostReputation,
                        accumulatedRewardAmount: hostInfo?.accumulatedRewardAmount,
                        reputedOnHeartbeat: hostInfo?.reputedOnHeartbeat,
                        active: hostInfo?.active,
                        ...repInfo
                    };
                    await hostClient.disconnect();
                }
                catch (e) {
                    console.error(e);
                }
            }));
            console.log(repInfos);
            console.log("Eligible ", Object.values(repInfos).filter(h => h.reputedOnHeartbeat).length);
            console.log("Active ", Object.values(repInfos).filter(h => h.active).length);
        }
    }
    catch (e) {
        console.error("Error occurred:", e);
    }
    finally {
        console.log('Done');
        if (process.argv[2] !== "rep" && process.argv[2] !== "hb") {
            await xrplApi.disconnect();
        }
    }
}

async function generateAccount() {
    const rippledServer = evernode.Defaults.values.rippledServer;

    const host = `${rippledServer.substring(6)}`;

    const timeDiff = Date.now() - genTime - 60000;
    if (timeDiff < 0) {
        const waitTime = timeDiff * (-1);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return generateAccount();
    }
    genTime = Date.now();

    const res = await new Promise((resolve, reject) => {
        var options = {
            hostname: host,
            port: 443,
            path: '/newcreds',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk.toString();
            });
            res.on('end', () => {
                resolve(data);
            });
        });

        req.on('error', (err) => {
            console.log(err);
            reject(err.message);
        });

        req.end();
    });

    genTime = Date.now();

    const result = JSON.parse(res);
    if (result.code !== "tesSUCCESS") {
        console.error(result);
        return null;
    }

    const xrplClient = new xrpl.Client(rippledServer);
    await xrplClient.connect();

    let attempts = 0;
    while (attempts >= 0) {
        await new Promise(solve => setTimeout(solve, 1000));
        const balance = await xrplClient.getXrpBalance(result.address).catch(async e => {
            if (e.message !== 'Account not found.') {
                await xrplClient.disconnect();
                console.error(e);
                return null;
            }
        });
        if (!balance) {
            if (++attempts <= 20)
                continue;
            await xrplClient.disconnect();
            console.error('Max timeout reached.');
            return null;
        }
        break;
    }

    await xrplClient.disconnect();
    return { address: result.address, secret: result.secret };
}

async function registerHost(address, secret) {
    const host = new evernode.HostClient(address, secret);
    await host.connect();

    if (await host.isRegistered())
        return true;

    console.log(`-----------Register host`);

    // Prepare host account for Evernode.
    console.log("Prepare...");
    await host.prepareAccount("localhost");

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
        await host.offerLease(i, leaseAmount, tosHash);
    }

    // Verify the registration.
    return await host.isRegistered();
}

async function prepareHostReputation(address, secret, reputationAddress, reputationSecret) {
    const host = new evernode.HostClient(address, secret);
    await host.connect();

    if (!await host.isRegistered()) {
        console.log('Host not registered!');
        return;
    }

    console.log(`-----------Prepare host reputation`);
    await host.prepareReputationAccount(reputationAddress, reputationSecret);

    // Get EVRs from the foundation if needed.
    const lines = await host.xrplAcc.getTrustLines(evernode.EvernodeConstants.EVR, evrIssuerAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 500) {
        console.log("Transfer EVRs...");
        const foundationAcc = new evernode.XrplAccount(foundationAddress, foundationSecret);
        await foundationAcc.makePayment(reputationAddress, "10", evernode.EvernodeConstants.EVR, evrIssuerAddress);
    }

    return;
}

async function startHostReputationSender(address, secret, reputationAddress, reputationSecret, hostList) {
    const host = new evernode.HostClient(address, secret);
    await host.connect({ reputationAddress: reputationAddress, reputationSecret: reputationSecret });

    const reputationClient = await evernode.HookClientFactory.create(evernode.HookTypes.reputation);
    await reputationClient.connect();

    if (!await host.isRegistered()) {
        console.log('Host not registered');
        return;
    }

    const momentSize = host.config.momentSize;
    const momentStartTimestamp = await host.getMomentStartIndex();
    const currentTimestamp = evernode.UtilHelpers.getCurrentUnixTime();
    const startTimeout = (momentStartTimestamp - currentTimestamp + momentSize + 7.5) * 1000;

    console.log(`Reputation sender scheduled in ${startTimeout} milliseconds.`);

    const scheduler = async () => {
        setTimeout(async () => {
            await scheduler();
        }, momentSize * 1000);
        let buffer = Buffer.alloc(1);
        const info = await reputationClient.getReputationInfo();
        const clusterSize = info?.count ?? 0;
        if (clusterSize > 0) {
            buffer = Buffer.alloc(66, 0);
            await Promise.all(Array.from({ length: clusterSize }, (_, i) => i).map(async (i) => {
                var score = 0;
                try {
                    const hostReputationInfo = await reputationClient.getReputationContractInfoByOrderedId(i);
                    if (!hostReputationInfo)
                        throw 'No reputation info for this order id';
                    const index = hostList.findIndex(h => h.host.address == hostReputationInfo.hostAddress);
                    if (index % 2 == 0) {
                        score = Math.floor(80 + (Math.random() * 20));
                    }
                    else {
                        score = Math.floor(60 + (Math.random() * 20));
                    }
                } catch (error) {
                    score = 0;
                }
                buffer.writeUIntLE(score, i + 1, 1);
            }));
            buffer.writeUIntLE(clusterSize, 65, 1);
        }
        buffer.writeUIntLE(3, 0, 1);
        await host.sendReputations(buffer?.toString('hex')).catch((e) => { console.error(address, reputationAddress, e) });
    };

    setTimeout(async () => {
        await scheduler();
    }, startTimeout);
}

async function startHostHeartbeatSender(address, secret, i) {
    const host = new evernode.HostClient(address, secret);
    await host.connect();

    if (!await host.isRegistered()) {
        console.log('Host not registered');
        return;
    }

    const momentSize = host.config.momentSize;
    const momentStartTimestamp = await host.getMomentStartIndex();
    const currentTimestamp = evernode.UtilHelpers.getCurrentUnixTime();
    const startTimeout = (momentStartTimestamp - currentTimestamp + momentSize + 5) * 1000;

    console.log(`Heartbeat sender scheduled in ${startTimeout} milliseconds.`);

    const scheduler = async () => {
        setTimeout(async () => {
            await scheduler();
        }, momentSize * 1000);
        var vote = null;
        // if (i % 2 == 0) {
        //     vote = evernode.EvernodeConstants.CandidateVote.Reject;
        // }
        // else if (i % 3 == 0) {
        vote = evernode.EvernodeConstants.CandidateVote.Support;
        // }
        for (const candidateId of candidateIds) {
            await host.heartbeat(!vote ? {} : { vote: vote, candidate: candidateId }).catch((e) => { console.error(address, e) });
        }
    };

    setTimeout(async () => {
        await scheduler();
    }, startTimeout);
}

async function createHost() {
    await new Promise(async resolve => {
        while (generating) {
            await new Promise(resolve2 => setTimeout(resolve2, 1000));
        }
        resolve();
    });
    generating = true;

    console.log('Generating host account...');
    const host = await generateAccount();

    await new Promise(solve => setTimeout(solve, 200));

    console.log('Generating host reputation account...');
    const reputation = await generateAccount();

    await new Promise(solve => setTimeout(solve, 200));

    generating = false;

    if (!host || !reputation) {
        console.log('Account generation failed!');
        return null;
    }

    console.log('Generated host accounts.');

    await registerHost(host.address, host.secret);

    await prepareHostReputation(host.address, host.secret, reputation.address, reputation.secret);

    return {
        host: host,
        reputation: reputation
    }
}

app().catch(console.error);
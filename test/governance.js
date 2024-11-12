const evernode = require("evernode-js-client");

async function main() {
    var governorClient;
    try {
        const cmd = process.argv[2];
        if (!cmd)
            throw new Error('No command specified');

        const environment = process.env.ENVIRONMENT || 'mainnet';
        const governor = process.env.GOVERNOR;
        const xahaud = process.env.XAHAUD;
        await evernode.Defaults.useNetwork(environment);
        const xrplApi = new evernode.XrplApi(xahaud, { autoReconnect: true });
        evernode.Defaults.set({
            xrplApi: xrplApi
        });
        if (governor)
            evernode.Defaults.set({
                governorAddress: governor
            });

        console.log(`Network: ${environment}, Governor: ${evernode.Defaults.values.governorAddress}`);
        console.log(`\nRunning command: ${cmd}\n`);

        const init = async () => {
            governorClient = await evernode.HookClientFactory.create(evernode.HookTypes.governor);
            await governorClient.connect();
        }

        switch (cmd) {
            case 'list':
                const type = process.argv[3];
                await init();
                await listProposals(governorClient, type);
                break;
            case 'info':
                const by = process.argv[3];
                const filter = process.argv[4];
                if (by === '--owner' && filter) {
                    await init();
                    await getCandidateByOwner(governorClient, filter);
                }
                else if (by === '--id' && filter) {
                    await init();
                    await getCandidateById(governorClient, filter);
                }
                else
                    throw new Error('No filter specified `info <filter-type(--owner|--id)> <filter-value>`');
                break;
            default:
                throw new Error(`Unknown command: ${cmd}`);
        }

    }
    catch (e) {
        console.error(e.toString(), `\nEnvironment variables:
    ENVIRONMENT (mainnet|testnet|devnet)
    GOVERNOR (Governor address to override)
    XAHAUD (XAHAUD node URL)\n`);
    }
    finally {

        if (governorClient)
            await governorClient.disconnect();
    }
}

function convertSeconds(seconds) {
    const days = Math.floor(seconds / (24 * 60 * 60));
    seconds %= 24 * 60 * 60;
    const hours = Math.floor(seconds / (60 * 60));
    seconds %= 60 * 60;
    const minutes = Math.floor(seconds / 60);
    seconds %= 60;

    return { days, hours, minutes, seconds };
}

function getTimeString(timeObj) {
    return `${timeObj.days ? `${timeObj.days} days,` : ''}${timeObj.hours ? `${timeObj.hours} hours,` : ''}${timeObj.minutes ? `${timeObj.minutes} minutes,` : ''}${timeObj.seconds} seconds`;
}

async function constructProposalInfo(governorClient, info) {
    try {
        const foundation = governorClient.config.foundationAddress;
        const voteBase = governorClient.config.governanceInfo.prevMomentVoteBaseCount;
        const expiry = governorClient.config.governanceConfiguration.candidateLifePeriod;
        const election = governorClient.config.governanceConfiguration.candidateElectionPeriod;
        const type = evernode.StateHelpers.getCandidateType(info.uniqueId);
        console.log(`\n================= ${info.uniqueId} (${Object.keys(evernode.EvernodeConstants.CandidateTypes)[type - 1]}) =================\n`);
        console.log(`Owner: ${info.ownerAddress === foundation ? 'Foundation' : info.ownerAddress}`);
        console.log(`Status: ${info.status}`);
        console.log(`Foundation: ${info.foundationVoteStatus}`);
        console.log(`Name: ${info.shortName}`);
        if (type === evernode.EvernodeConstants.CandidateTypes.NewHook) {
            console.log(`Governor: ${info.governorHookHash}`);
            console.log(`Registry: ${info.registryHookHash}`);
            console.log(`Heartbeat: ${info.heartbeatHookHash}`);
            console.log(`Reputation: ${info.reputationHookHash}`);
        }

        console.log(`\nVotes: ${info.positiveVoteCount}/${voteBase}`);

        const electSecs = info.statusChangeTimestamp + election - Math.floor(new Date().getTime() / 1000);
        const purgeSecs = info.createdTimestamp + expiry - Math.floor(new Date().getTime() / 1000);
        if (info.status === "supported") {
            console.log(`Time to elect: ${electSecs >= 0 ? getTimeString(convertSeconds(electSecs)) : 'In a few moment'}`);
            if (purgeSecs < electSecs && type !== evernode.EvernodeConstants.CandidateTypes.PilotedMode)
                console.log('!!! This candidate will get purged before it can be elected !!!\n');
        }
        else if (info.status === "elected")
            console.log(`Time to elect: In a few moment'`);

        if (info.status === "purged")
            console.log(`Time to purge: In a few moment'`);
        else if (info.status !== "elected" && type !== evernode.EvernodeConstants.CandidateTypes.PilotedMode)
            console.log(`Time to purge: ${purgeSecs >= 0 ? getTimeString(convertSeconds(purgeSecs)) : 'In a few moment'}`);

        console.log(`\n=========================================================================================================\n`);
    }
    catch (e) {
        console.error(e);
    }
}

async function listProposals(governorClient, type) {
    const proposals = await governorClient.getAllCandidatesFromLedger();
    const types = Object.keys(evernode.EvernodeConstants.CandidateTypes);
    if (type && !types.includes(type))
        throw new Error(`Unknown candidate type: ${type} options are: ${types.join(', ')}`);
    const filtered = type ? proposals.filter(p => evernode.StateHelpers.getCandidateType(p.uniqueId) === evernode.EvernodeConstants.CandidateTypes[type]) : proposals;
    filtered
        .sort((a, b) => evernode.StateHelpers.getCandidateType(a.uniqueId) - evernode.StateHelpers.getCandidateType(b.uniqueId))
        .map(p => constructProposalInfo(governorClient, p));
}

async function getCandidateByOwner(governorClient, owner) {
    console.log(`--- Only ${Object.keys(evernode.EvernodeConstants.CandidateTypes)[evernode.EvernodeConstants.CandidateTypes.NewHook - 1]} proposals will be listed ---`);
    if (owner?.toLowerCase() === 'foundation')
        owner = governorClient.config.foundationAddress;
    const info = await governorClient.getCandidateByOwner(owner);
    constructProposalInfo(governorClient, info);
}

async function getCandidateById(governorClient, id) {
    const info = await governorClient.getCandidateById(id);
    constructProposalInfo(governorClient, info);
}

main().then(() => process.exit(0)).catch((e) => console.error(e.message));
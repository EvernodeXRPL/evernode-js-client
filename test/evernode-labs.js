const evernode = require("evernode-js-client");

async function main() {
    var foundationClient;
    try {
        const cmd = process.argv[2];
        if (!cmd)
            throw new Error('No command specified');

        const environment = process.env.ENVIRONMENT || 'mainnet';
        const governor = process.env.GOVERNOR;
        const foundationAddress = process.env.EV_LABS_ADDRESS;
        const foundationSecret = process.env.EV_LABS_SECRET;
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

        const init = async () => {
            foundationClient = new evernode.FoundationClient(foundationAddress, foundationSecret);
            await foundationClient.connect();
            console.log(`Foundation: ${foundationClient.xrplAcc.address}`);
        }

        console.log(`Network: ${environment}, Governor: ${evernode.Defaults.values.governorAddress}`);
        console.log(`\nRunning command: ${cmd}\n`);

        await init();
        switch (cmd) {
            case 'mode-change':
                const mode = process.argv[3];
                await changeGovernanceMode(foundationClient, mode);
                break;
            case 'config':
                getConfig(foundationClient);
                break;
            case 'vote':
                const id = process.argv[3];
                const vote = process.argv[4];
                await voteForCandidate(foundationClient, id, vote);
                break;
            case 'propose':
                const pType = process.argv[3];
                const pValue = process.argv[4];
                const pName = process.argv[5];
                await proposeCandidate(foundationClient, pType, pValue, pName);
                break;
            case 'withdraw':
                const pid = process.argv[3];
                await withdraw(foundationClient, pid);
                break;
            default:
                throw new Error(`Unknown command: ${cmd}`);
        }
    }
    catch (e) {
        const readableErr = e.toString();
        console.error(readableErr !== '[object Object]' ? readableErr : e, `\nEnvironment variables:
    ENVIRONMENT (mainnet|testnet|devnet)
    GOVERNOR (Governor address to override)
    EV_LABS_ADDRESS (Evernode labs account address)
    EV_LABS_SECRET (Evernode labs account secret)
    XAHAUD (XAHAUD node URL)\n`);
    }
    finally {
        if (foundationClient)
            await foundationClient.disconnect();
    }
}

async function changeGovernanceMode(foundationClient, mode) {
    const modes = Object.keys(evernode.EvernodeConstants.GovernanceModes);
    if (!mode || !modes.includes(mode))
        throw new Error(`Unknown governance mode: ${mode} options are: ${modes.join(', ')}`);
    const converted = evernode.EvernodeConstants.GovernanceModes[mode];
    await foundationClient.changeGovernanceMode(converted);
}

function getConfig(foundationClient) {
    console.log(foundationClient.config);
}

async function voteForCandidate(foundationClient, id, vote) {
    const votes = Object.keys(evernode.EvernodeConstants.CandidateVote);
    if (!vote || !votes.includes(vote))
        throw new Error(`Unknown governance vote: ${vote} options are: ${votes.join(', ')}`);
    const converted = evernode.EvernodeConstants.CandidateVote[vote];
    if (id)
        await foundationClient.vote(id, converted);
    else
        throw new Error('No candidate specified `vote <candidate-id> <vote(support|reject)>`');
}

async function proposeCandidate(foundationClient, type, value, name) {
    if (type === '--new-hook' && value && name)
        await foundationClient.propose(value, name);
    else if (type === '--dud-host' && value)
        await foundationClient.reportDudHost(value);
    else
        throw new Error('No candidate specified `propose <candidate-type(--new-hook|--dud-host)> <candidate-value(hook-hashes|dud-host-address)> <name(except-for-dud-host)>`');
}

async function withdraw(foundationClient, id) {
    if (id)
        await foundationClient.withdraw(id);
    else
        throw new Error('No candidate specified `withdraw <candidate-id>`');
}

main().then(() => process.exit(0)).catch((e) => console.error(e.message));
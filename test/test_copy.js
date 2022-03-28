// const evernode = require("evernode-js-client");
const evernode = require("../dist");  // Local dist dir. (use 'npm run build' to update)

const evrIssuerAddress = "rGXfRUyC4QUBxJbDXiEYnyRBCoTgtHYJfU";
const registryAddress = "rNronq4u4hNKRMW1BpidCwjk8BPYze4wyb";
const registrySecret = "snaRKvZGvT1RtGhojw9Sh9MM7ppLh";
const hostAddress = "rJuY6p7aRnYaEFe12V4XqH4i3W5JS92BY1";
const hostSecret = "snsAYBpcNQjQdQGQVRxrmjDb8X62S";
const hostToken = "OXO";
const foundationAddress = "rNqBr7PJnThQXAXWgFYwCe9SLHXndxNJbj";
const foundationSecret = "sn7w1G5EqpkCZ3jNDnctZcBWaudsd";
const userAddress = "rJPd1PJJrcEqPNKBWuz5zG4mGepXE211fa";
const userSecret = "shCMVtVAq8nbxKvWb8bXmoQZzZGbC";

const clients = [];

async function app() {

    // Use a singleton xrplApi for all tests.
    const xrplApi = new evernode.XrplApi();
    evernode.Defaults.set({
        registryAddress: registryAddress,
        xrplApi: xrplApi
    })

    try {
        const host = new evernode.XrplAccount(hostAddress, hostSecret, { xrplApi: xrplApi });
        await xrplApi.connect();
        const accKeyPair = host.deriveKeypair();
        let accountSetFields = { MessageKey: accKeyPair.publicKey };
        await host.setAccountFields(accountSetFields);

        // Registering..
        console.log("Registering...");
        const count = 15;
        for (let index = 0; index < count; index++) {
            console.log(`Instance NFT ${index + 1}/${count}`);
            await host.mintNft(`evrlease${index + 1}`, 0, 0, { isBurnable: 1 });
        }
        const nfts = await host.getNfts();
        console.log(nfts);
        for (const nft of nfts) {
            console.log(`NFT ${nft.TokenID}`);
            await host.offerSellNft(nft.TokenID, undefined, '10', 'EVR', registryAddress);
            // await host.burnNft(nft.TokenID);
        }

        const sellOffers = await host.getNftOffers();
        console.log(sellOffers);

        // if (sellOffers.length > 0) {
        //     const user = new evernode.XrplAccount(userAddress, userSecret, { xrplApi: xrplApi });
        //     console.log(`Buying NFT ${sellOffers[0].index}`);
        //     await user.buyNft(sellOffers[0].index);
        //     const userNfts = await user.getNfts();
        //     console.log(userNfts);

        //     console.log(`Burning NFT ${userNfts[0].TokenID} by host`);
        //     await host.burnNft(userNfts[0].TokenID);
        // }
    }
    catch (e) {
        console.error("Error occured:", e);
    }
    finally {
        await xrplApi.disconnect();
    }
}



async function registerHost(address = hostAddress, secret = hostSecret, token = hostToken) {
    const host = await getHostClient(address, secret);

    if (await host.isRegistered())
        return true;

    console.log(`-----------Register host`);

    // Prepare host account for Evernode.
    // console.log("Prepare...");
    // await host.prepareAccount();

    // Get EVRs from the foundation if needed.
    const lines = await host.xrplAcc.getTrustLines(evernode.EvernodeConstants.EVR, evrIssuerAddress);
    if (lines.length === 0 || parseInt(lines[0].balance) < 5120) {
        console.log("Transfer EVRs...");
        const foundationAcc = new evernode.XrplAccount(foundationAddress, foundationSecret);
        await foundationAcc.makePayment(address, "5120", evernode.EvernodeConstants.EVR, evrIssuerAddress);
    }

    console.log("Register...");
    await host.register(token, "AU", 10000, 512, 1024, 5, "Test desctiption");

    // Verify the registration.
    return await host.isRegistered();
}

//////////////////////////////////////////////////////////////////////////////////////

async function getUserClient() {
    const client = new evernode.UserClient(userAddress, userSecret);
    await client.connect();
    clients.push(client);
    return client;
}

async function getHostClient(address = hostAddress, secret = hostSecret) {
    const client = new evernode.HostClient(address, secret,);
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
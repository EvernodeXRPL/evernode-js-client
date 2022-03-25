// const evernode = require("evernode-js-client");
const evernode = require("../dist");  // Local dist dir. (use 'npm run build' to update)
const xrpl = require('xrpl');

const registryAddress = "rNronq4u4hNKRMW1BpidCwjk8BPYze4wyb";
const hostAddress = "rJuY6p7aRnYaEFe12V4XqH4i3W5JS92BY1";
const hostSecret = "snsAYBpcNQjQdQGQVRxrmjDb8X62S";
const tenantAddress = "rJPd1PJJrcEqPNKBWuz5zG4mGepXE211fa";
const tenantSecret = "shCMVtVAq8nbxKvWb8bXmoQZzZGbC";

const clients = [];

async function app() {

    // Use a singleton xrplApi for all tests.
    evernode.Defaults.set({
        registryAddress: registryAddress
    })
    let tenant;
    const client = new xrpl.Client("wss://xls20-sandbox.rippletest.net:51233");
    try {
        await client.connect();

        let run = true
        client.request({ command: 'subscribe', accounts: [hostAddress] })
        client.on("transaction", async (data) => {
            if (data.engine_result === 'tesSUCCESS' && data.transaction.TransactionType === 'NFTokenAcceptOffer') {
                if (data.transaction.Account !== hostAddress && data.transaction.SellOffer && !data.transaction.BuyOffer) {
                    try {
                        const tx = {
                            ...data.transaction
                        }; 
                        await new Promise(resolve => {
                            setTimeout(() => {
                                resolve();
                            }, 1000);
                        })
                        console.log(tx.Memos[0].Memo.MemoData)
                        const xrplApi = new evernode.XrplApi();
                        await xrplApi.connect();
                        const hostAcc = new evernode.XrplAccount(hostAddress, hostSecret, { xrplApi: xrplApi });
                        const key = await hostAcc.deriveKeypair();
                        const decryptData = await evernode.EncryptionHelper.decrypt(key.privateKey, evernode.TransactionHelper.hexToASCII('4244446B555A6C5A455830594F4249794A5170614E74566870505048695A3554776D6A796168724E304A6950616637764C393638545A4A557962682F6D3372715063746E4D4E653770494A4D64564F3175674B78794272507636506A7673516643314D633646483830662B4F53554E654D4573474E424D7744566E6C566E5054596849496C4652784245307366432F42716234477635716B51426E392B75634563395A7242746F7A4A756A4D3363526959616E4D55554A7456684D53457631442B773D3D'));
                        console.log(decryptData);
                        run = false;
                        await xrplApi.disconnect();
                        await client.disconnect();
                    } catch (error) {
                        console.error(error);
                    }
                }
            }
        });
        tenant = new evernode.TenantClient(tenantAddress, tenantSecret);
        await tenant.connect();
        await tenant.prepareAccount();

        console.log(await tenant.aquireLease(hostAddress, { requirement: '1' }));

        while (run) {
            setTimeout(() => {

            }, 1000);
        }
    }
    catch (e) {
        console.error("Error occured:", e);
    }
    finally {
        await tenant.disconnect();
        await client.disconnect();
    }
}

app();
// Import the libraries
const { Client } = require("xrpl")
const { writeFileSync, existsSync } = require("fs");
const process = require('process');

// Wrap executions in an async function.
async function main() {
    try {

        // Paths to update.
        const basePath = (process.argv[2] == 'external') ? "../../" : "./"
        const XRPL_BIN_CODEC_PATH = `${basePath}node_modules/xrpl-binary-codec/dist/enums/definitions.json`
        const RIPPLE_BIN_CODEC_PATH = `${basePath}node_modules/ripple-binary-codec/dist/enums/definitions.json`

        // Define the network client
        const SERVER_URL = "wss://hooks-testnet-v3.xrpl-labs.com"
        const client = new Client(SERVER_URL, { connectionTimeout: 60000 })
        await client.connect()

        // Get server definitions via the API command.
        try {
            const response = await client.request({
                "command": "server_definitions"
            })

            if (response?.result) {

                // Update definition files.
                if (existsSync(XRPL_BIN_CODEC_PATH)) {
                    writeFileSync(XRPL_BIN_CODEC_PATH, JSON.stringify(response.result, null, 4))
                    console.log('Server definition update was successful in xrpl-binary-codec.')
                }

                if (existsSync(RIPPLE_BIN_CODEC_PATH)) {
                    writeFileSync(RIPPLE_BIN_CODEC_PATH, JSON.stringify(response.result, null, 4))
                    console.log('Server definition update was successful in ripple-binary-codec.')
                }

            } else
                console.log('No server result was found.')

        } catch (e) {
            console.error(e)
            console.log('Server definition update was failed.')
        } finally {
            // Disconnect when done so Node.js can end the process
            client.disconnect()
        }

    } catch (e) {
        console.error(e)
        console.log('Server connectivity problem occurred.')
    }
}

// call the async function
main()
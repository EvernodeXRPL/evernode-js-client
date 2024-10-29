const https = require('https');

const DefinitionsUrl = 'https://raw.githubusercontent.com/EvernodeXRPL/evernode-resources/main/definitions/definitions.json';

const DefaultValues = {
    xrplApi: null
}

const HookTypes = {
    governor: 'GOVERNOR',
    registry: 'REGISTRY',
    heartbeat: 'HEARTBEAT',
    reputation: 'REPUTATION'
}

const getDefinitions = async () => {
    return new Promise((resolve, reject) => {
        https.get(DefinitionsUrl, res => {
            let data = [];
            if (res.statusCode != 200)
                reject(`Error: ${res.statusMessage}`);
            res.on('data', chunk => {
                data.push(chunk);
            });
            res.on('end', () => {
                resolve(JSON.parse(data));
            });
        }).on('error', err => {
            reject(`Error: ${err.message}`);
        });
    });
}

/**
 * Defaults class is responsible for retrieving and overriding the default Evernode network configurations.
 */
class Defaults {
    /**
     * Load defaults from the public definitions json.
     * @param {string} network Network to choose the info.
     */
    static async useNetwork(network) {
        const definitions = await getDefinitions();

        if (!definitions[network])
            throw `Invalid network: ${network}`;

        this.set(definitions[network]);
    }

    /**
     * Override Evernode default configs.
     * @param {object} newDefaults Configurations to override `{ governorAddress: '{string} governor xrpl address', rippledServer: '{string} rippled server url', xrplApi: '{XrplApi} xrpl instance', stateIndexId: '{string} firestore index', networkID: '{number} rippled network id' }`
     * @returns {void}
     * @example Defaults.set({governorAddress: 'rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL'});
     */
    static set(newDefaults) {
        Object.assign(DefaultValues, newDefaults)
    }

    /**
     * Read Evernode default configs.
     * @returns The Object of Evernode configs
     * @example const defaults = Defaults.values;
     */
    static get values() {
        return { ...DefaultValues };
    }
}

module.exports = {
    Defaults,
    HookTypes
}
const { HookTypes } = require("../../defaults");
const { RegistryClient } = require("./registry-client");
const { GovernorClient } = require("./governor-client");
const { HeartbeatClient } = require("./heartbeat-client");
const { ReputationClient } = require("./reputation-client");

class HookClientFactory {
    /**
     * Creates a hook client from given type.
     * @param {string} hookType Type of the Required Hook. (Supported Hook types 'GOVERNOR', 'REGISTRY' and 'HEARTBEAT')
     * @returns Instance of requested HookClient type.
     */
    static async create(hookType, options = {}) {
        let governorClient;
        if (hookType !== HookTypes.governor && !options.config) {
            governorClient = new GovernorClient(options);
            try {
                await governorClient.connect();
                options.config = governorClient.config;
            } catch (error) {
                throw (error)
            } finally {
                await governorClient.disconnect();
            }
        }

        let hookClient;
        switch (hookType) {
            case HookTypes.governor: {
                hookClient = new GovernorClient(options);
                break;
            }
            case HookTypes.registry: {
                const registryAddress = await HookClientFactory.#getAccountAddress(hookType, options.config);
                hookClient = new RegistryClient({ ...options, registryAddress: registryAddress });
                break;
            }
            case HookTypes.heartbeat: {
                const heartbeatAddress = await HookClientFactory.#getAccountAddress(hookType, options.config);
                hookClient = new HeartbeatClient({ ...options, heartbeatAddress: heartbeatAddress });
                break;
            }
            case HookTypes.reputation: {
                const reputationAddress = await HookClientFactory.#getAccountAddress(hookType, options.config);
                hookClient = new ReputationClient({ ...options, reputationAddress: reputationAddress });
                break;
            }
            default: {
                hookClient = null;
                break;
            }
        }

        return hookClient;
    }

    static async #getAccountAddress(hookType, config) {
        if (hookType == HookTypes.registry)
            return config.registryAddress;
        else if (hookType == HookTypes.heartbeat)
            return config.heartbeatAddress;
        else if (hookType == HookTypes.reputation)
            return config.reputationAddress;
    }
}

module.exports = {
    HookClientFactory
}
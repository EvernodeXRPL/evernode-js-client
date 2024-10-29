const { HookTypes } = require("../../defaults");
const { RegistryClient } = require("./registry-client");
const { GovernorClient } = require("./governor-client");
const { HeartbeatClient } = require("./heartbeat-client");
const { ReputationClient } = require("./reputation-client");

/**
 * A factory class for creating different types of hook clients based on the provided hook type.
 * @summary
 * In Evernode, there are three distinct types of hooks:
 * 
 * - Governor Hook
 * - Registry Hook
 * - Heartbeat Hook
 * - Reputation Hook
 * 
 * Each of these hooks is associated with a separate Xahau account. Therefore, in various scenarios, it becomes necessary to create client instances to engage with these hooks.
 * This section aims to enhance your comprehension of the available hook clients in Evernode. It will provide you with detailed specifications and guidance on how to utilize them effectively within Evernode.
 * The Hook Client Factory provides a common interface for creating hook clients. Developers can instantiate hook clients with minimal effort.
 * @class
 */

class HookClientFactory {
    /**
     * Creates a hook client from given type.
     * @param {string} hookType Type of the Required Hook. (Supported Hook types 'GOVERNOR', 'REGISTRY', 'HEARTBEAT' and 'REPUTATION')
     * @param {Object} [options={}] - Optional configuration for the hook client.
     * @returns {Promise<Object|null>} - Returns a promise that resolves to an instance of the requested HookClient type, or `null` if the type is unsupported.
     * @throws {Error} Will throw an error if there is an issue connecting to the GovernorClient or obtaining the necessary configuration.
     * @example
     * Defaults.set({governorAddress: "rGVHr1PrfL93UAjyw3DWZoi9adz2sLp2yL"});
     * const governorClient = await HookClientFactory.create(HookTypes.governor);
     * const registryClient = await HookClientFactory.create(HookTypes.registry);
     * const heartbeatClient = await HookClientFactory.create(HookTypes.heartbeat);
     * const reputationClient = await HookClientFactory.create(HookTypes.reputation);
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
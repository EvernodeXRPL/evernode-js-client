const { HookTypes } = require("../../defaults");
const { RegistryClient } = require("./registry-client");
const { GovernorClient } = require("./governor-client");
const { HeartbeatClient } = require("./heartbeat-client");

class HookClientFactory {
    static async create(hookType) {
        let hookClient;
        switch (hookType) {
            case HookTypes.governor: {
                hookClient = new GovernorClient();
                break;
            }
            case HookTypes.registry: {
                const registryAddress = await HookClientFactory.#getAccountAddress(hookType);
                hookClient = new RegistryClient({ registryAddress: registryAddress });
                break;
            }
            case HookTypes.heartbeat: {
                const heartbeatAddress = await HookClientFactory.#getAccountAddress(hookType);
                hookClient = new HeartbeatClient({ heartbeatAddress: heartbeatAddress });
                break;
            }
            default: {
                hookClient = null;
                break;
            }
        }

        return hookClient;
    }

    static async #getAccountAddress(hookType) {
        const governorHook = await HookClientFactory.create(HookTypes.governor);

        let configs;
        try {
            await governorHook.connect();
            configs = governorHook.config;
        } catch (error) {
            throw (error)
        } finally {
            await governorHook.disconnect();
        }

        if (hookType == HookTypes.registry)
            return configs.registryAddress;
        else if (hookType == HookTypes.heartbeat)
            return configs.heartbeatAddress;

    }
}

module.exports = {
    HookClientFactory
}
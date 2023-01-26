const { HookAccountTypes } = require("../../defaults");
const { RegistryClient } = require("./registry-client");
const { GovernorClient } = require("./governor-client");
const { HeartbeatClient } = require("./heartbeat-client");

class HookClientFactory {
    static async create(hookAccountType) {
        let hookAccount;
        switch (hookAccountType) {
            case HookAccountTypes.governorHook: {
                hookAccount = new GovernorClient();
                break;
            }
            case HookAccountTypes.registryHook: {
                const registryAddress = await HookClientFactory.#getAccountAddress(hookAccountType);
                hookAccount = new RegistryClient({registryAAddress: registryAddress});
                break;
            }
            case HookAccountTypes.heartbeatHook: {
                const heartbeatAddress = await HookClientFactory.#getAccountAddress(hookAccountType);
                hookAccount = new HeartbeatClient({heartbeatAddress: heartbeatAddress});
                break;
            }
            default: {
                hookAccount = null;
                break;
            }
        }

        return hookAccount;
    }

    static async #getAccountAddress(hookAccountType) {
        const governorHook = await HookClientFactory.create(HookAccountTypes.governorHook);

        let configs;
        try {
            await governorHook.connect();
            configs = governorHook.config;     
        } catch (error) {
            throw(error)  
        } finally {
            await governorHook.disconnect();
        }

        if(hookAccountType == HookAccountTypes.registryHook)
            return configs.registryAddress;
        else if (hookAccountType == HookAccountTypes.heartbeatHook)
            return configs.heartbeatAddress;

    }
}

module.exports = {
    HookClientFactory
}
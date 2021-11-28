export const DefaultValues = {
    hookAddress: 'r3q12vGjcvXXEvRvcDwczesmG2jR81tvsE',
    rippledServer: 'wss://hooks-testnet.xrpl-labs.com'
}

export class Defaults {
    static set(newDefaults) {
        Object.assign(DefaultValues, newDefaults)
    }

    static get() {
        return { ...DefaultValues };
    }
}
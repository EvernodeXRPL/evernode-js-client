const RippleAPI = require('ripple-lib').RippleAPI;
const { EventEmitter } = require('./event-emitter');
const { RippleAPIEvents, RippleConstants } = require('./ripple-common');

const CONNECTION_RETRY_THREASHOLD = 60;
const CONNECTION_RETRY_INTERVAL = 1000;

export class RippleAPIWrapper {
    constructor(rippledServer = null) {

        this.connectionRetryCount = 0;
        this.connected = false;
        this.rippledServer = rippledServer || RippleConstants.DEFAULT_RIPPLED_SERVER;
        this.events = new EventEmitter();

        this.api = new RippleAPI({ server: this.rippledServer });
        this.api.on('error', (errorCode, errorMessage) => {
            console.log(errorCode + ': ' + errorMessage);
        });
        this.api.on('connected', () => {
            console.log(`Connected to ${this.rippledServer}`);
            this.connectionRetryCount = 0;
            this.connected = true;
        });
        this.api.on('disconnected', async (code) => {
            if (!this.connected)
                return;

            this.connected = false;
            console.log(`Disconnected from ${this.rippledServer} code:`, code);
            try {
                await this.connect();
                this.events.emit(RippleAPIEvents.RECONNECTED, `Reconnected to ${this.rippledServer}`);
            }
            catch (e) { console.error(e); };
        });
        this.api.on('ledger', (ledger) => {
            this.ledgerVersion = ledger.ledgerVersion;
            this.events.emit(RippleAPIEvents.LEDGER, ledger);
        });
    }

    async connect() {
        if (this.connected)
            return;

        let retryInterval = CONNECTION_RETRY_INTERVAL;
        this.tryConnecting = true;
        // If failed, Keep retrying and increasing the retry timeout.
        while (this.tryConnecting) {
            try {
                this.connectionRetryCount++;
                await this.api.connect();
                this.ledgerVersion = await this.api.getLedgerVersion();
                return;
            }
            catch (e) {
                console.log(`Couldn't connect ${this.rippledServer} : `, e);
                // If threashold reaches, increase the retry interval.
                if (this.connectionRetryCount % CONNECTION_RETRY_THREASHOLD === 0)
                    retryInterval += CONNECTION_RETRY_INTERVAL;
                // Wait before retry.
                await new Promise(resolve => setTimeout(resolve, retryInterval));
            }
        }
    }

    async disconnect() {
        if (!this.connected)
            return;
        this.tryConnecting = false;
        this.connected = false;
        await this.api.disconnect();
        console.log(`Disconnected from ${this.rippledServer}`);
    }

    deriveAddress(publicKey) {
        return this.api.deriveAddress(publicKey);
    }

    async getAccountInfo(address) {
        return (await this.api.request('account_info', { account: address }));
    }

    async isValidKeyForAddress(publicKey, address) {
        const info = await this.getAccountInfo(address);
        const accountFlags = this.api.parseAccountFlags(info.account_data.Flags);
        const regularKey = info.account_data.RegularKey;
        const derivedPubKeyAddress = this.deriveAddress(publicKey);

        // If the master key is disabled the derived pubkey address should be the regular key.
        // Otherwise it could be account address or the regular key
        if (accountFlags.disableMasterKey)
            return regularKey && (derivedPubKeyAddress === regularKey);
        else
            return derivedPubKeyAddress === address || (regularKey && derivedPubKeyAddress === regularKey);
    }
}
const xrpl = require('xrpl');
const kp = require('ripple-keypairs');
const { EventEmitter } = require('./event-emitter');
const { RippleAPIEvents, RippleConstants } = require('./ripple-common');

export class RippleAPIWrapper {
    constructor(rippledServer = null) {

        this.connected = false;
        this.rippledServer = rippledServer || RippleConstants.DEFAULT_RIPPLED_SERVER;
        this.events = new EventEmitter();
        this.options = options;

        this.client = new xrpl.Client(this.rippledServer);

        this.client.on('error', (errorCode, errorMessage) => {
            console.log(errorCode + ': ' + errorMessage);
        });
        this.client.on('disconnected', async (code) => {
            if (!this.connected)
                return;

            this.connected = false;
            console.log(`Disconnected from ${this.rippledServer} code:`, code);
        });
        this.client.on('ledgerClosed', (ledger) => {
            this.ledgerVersion = ledger.ledger_index;
            this.events.emit(RippleAPIEvents.LEDGER, ledger);
        });
    }

    async connect() {
        if (this.connected)
            return;

        try {
            await this.client.connect();
            console.log(`Connected to ${this.rippledServer}`);
            this.connected = true;

            this.ledgerVersion = await this.client.getLedgerIndex();
        }
        catch (e) {
            console.log(`Couldn't connect ${this.rippledServer} : `, e);
        }
    }

    async disconnect() {
        const wasConnected = this.connected;
        this.connected = false;
        await this.client.disconnect().catch(console.error);
        if (wasConnected)
            console.log(`Disconnected from ${this.rippledServer}`);
    }

    async isValidKeyForAddress(publicKey, address) {
        const info = await this.getAccountInfo(address);
        const accountFlags = xrpl.parseAccountRootFlags(info.account_data.Flags);
        const regularKey = info.account_data.RegularKey;
        const derivedPubKeyAddress = kp.deriveAddress(publicKey);

        // If the master key is disabled the derived pubkey address should be the regular key.
        // Otherwise it could be account address or the regular key
        if (accountFlags.lsfDisableMaster)
            return regularKey && (derivedPubKeyAddress === regularKey);
        else
            return derivedPubKeyAddress === address || (regularKey && derivedPubKeyAddress === regularKey);
    }

    async getAccountInfo(address) {
        const resp = (await this.client.request({ command: 'account_info', account: address }));
        return resp?.result;
    }

    async getAccountObjects(address, options) {
        const resp = (await this.client.request({ command: 'account_objects', account: address, ...options }));
        if (resp?.result?.account_objects)
            return res.account_objects;
        return [];
    }

    async getTrustlines(address, options) {
        const resp = (await this.client.request({ command: 'account_lines', account: address, ...options }));
        if (resp?.result?.lines)
            return res.lines;
        return [];
    }

    async subscribeToAddresses(addresses) {
        await this.client.request({ command: 'subscribe', accounts: addresses });
    }
}
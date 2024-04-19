const crypto = require("crypto");
const codec = require('ripple-address-codec');

const LEDGER_ENTRY_TYPES = {
    HOOK_DEFINITION: 68, // Decimal value of ASCII 'D'
    ACCOUNT: 97 // Decimal value of ASCII 'a'
}

class HookHelpers {

    static getKeylet(type, index) {
        const keyletBuf = Buffer.alloc(34, 0);
        keyletBuf.writeInt16BE(LEDGER_ENTRY_TYPES[type.toUpperCase()]);
        Buffer.from(index, 'hex').copy(keyletBuf, 2);

        return keyletBuf.toString('hex');
    }
    
    static getHookDefinitionIndex(hookHash) {
        const typeBuf = Buffer.alloc(2, 0);
        typeBuf.writeInt16BE(LEDGER_ENTRY_TYPES.HOOK_DEFINITION);

        const hookHashBuf = Buffer.from(hookHash, 'hex');

        let hash = crypto.createHash('sha512');

        let data = hash.update(typeBuf);
        data = hash.update(hookHashBuf);

        const digest = data.digest('hex');
        // Get the first 32 bytes of hash.
        return digest.substring(0, 64).toUpperCase();
    }

    static getAccountIndex(address) {
        const typeBuf = Buffer.alloc(2, 0);
        typeBuf.writeInt16BE(LEDGER_ENTRY_TYPES.ACCOUNT);

        const accountBuf = Buffer.from(codec.decodeAccountID(address), "hex");

        let hash = crypto.createHash('sha512');

        let data = hash.update(typeBuf);
        data = hash.update(accountBuf);

        const digest = data.digest('hex');
        // Get the first 32 bytes of hash.
        return digest.substring(0, 64).toUpperCase();
    }
}

module.exports = {
    HookHelpers
}
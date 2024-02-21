const crypto = require("crypto");

const HOOK_DEFINITION_LEDGER_TYPE_PREFIX = 68; // Decimal value of ASCII 'D'

class HookHelpers {
    static getHookDefinitionIndex(hookHash) {
        const typeBuf = Buffer.alloc(2, 0);
        typeBuf.writeInt16BE(HOOK_DEFINITION_LEDGER_TYPE_PREFIX);

        const hookHashBuf = Buffer.from(hookHash, 'hex');

        let hash = crypto.createHash('sha512');

        let data = hash.update(typeBuf);
        data = hash.update(hookHashBuf);

        const digest = data.digest('hex');
        // Get the first 32 bytes of hash.
        return digest.substring(0, 64).toUpperCase();
    }

    static getHookDefinitionKeylet(index) {
        const keyletBuf = Buffer.alloc(34, 0);
        keyletBuf.writeInt16BE(HOOK_DEFINITION_LEDGER_TYPE_PREFIX);
        Buffer.from(index, 'hex').copy(keyletBuf, 2);

        return keyletBuf.toString('hex');
    }
}

module.exports = {
    HookHelpers
}
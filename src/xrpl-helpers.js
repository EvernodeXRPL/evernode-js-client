const { sign, derive, XrplDefinitions, binary } = require('xrpl-accountlib')
class XrplHelpers {
    definitions;
    constructor(definition) {
        this.definitions = new XrplDefinitions(definition);
    }
    encode(transacion) {
        return binary.encode(transacion, this.definitions);
    }
    decode(transacion) {
        return binary.decode(transacion, this.definitions)
    }

    sign(tx, secret, isMultiSign = false) {
        const account = derive.familySeed(secret);
        const signed = sign(tx, (isMultiSign ? [account.signAs(account.address)] : account), this.definitions);
        return {
            hash: signed.id,
            tx_blob: signed.signedTransaction
        }
    }
}

module.exports = {
    XrplHelpers
}
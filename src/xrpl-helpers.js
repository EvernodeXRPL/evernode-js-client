const { sign, derive, XrplDefinitions, binary } = require('xrpl-accountlib')
class XrplHelpers{
    newDefinitions;
    constructor(definition) {
        this.newDefinitions = new XrplDefinitions(definition);
    }
    encode(transacion){
        return binary.encode(transacion);
    }
    decode(transacion){
        return binary.decode(transacion)
    }

    sign(tx, secret,isMultiSign = false) {
        const account = derive.familySeed(secret);
        const signed = sign(tx, (isMultiSign ? [account.signAs(account.address)] : account));
        return {
            hash: signed.id,
            tx_blob: signed.signedTransaction
        }
    }
    multiSign(transactions,isMultiSign=true,accountsArray){
        const signed = sign(transactions,accountsArray ,this.newDefinitions)
        console.log("----------xxx-------",signed)
        return signed
    }
}

module.exports = {
    XrplHelpers
}
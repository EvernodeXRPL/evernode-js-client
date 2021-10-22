const eccrypto = require("eccrypto");

export class EncryptionHelper {
    // Offsets of the properties in the encrypted buffer.
    static ivOffset = 65;
    static macOffset = this.ivOffset + 16;
    static ciphertextOffset = this.macOffset + 32;
    static contentFormat = 'base64';
    static keyFormat = 'hex';

    static async encrypt(publicKey, json) {
        // For the encryption library, both keys and data should be buffers.
        const encrypted = await eccrypto.encrypt(Buffer.from(publicKey, this.keyFormat), Buffer.from(JSON.stringify(json)));
        // Concat all the properties of the encrypted object to a single buffer.
        return Buffer.concat([encrypted.ephemPublicKey, encrypted.iv, encrypted.mac, encrypted.ciphertext]).toString(this.contentFormat);
    }

    static async decrypt(privateKey, encrypted) {
        // Extract the buffer from the string and prepare encrypt object from buffer offsets for decryption.
        const encryptedBuf = Buffer.from(encrypted, this.contentFormat);
        const encryptedObj = {
            ephemPublicKey: encryptedBuf.slice(0, this.ivOffset),
            iv: encryptedBuf.slice(this.ivOffset, this.macOffset),
            mac: encryptedBuf.slice(this.macOffset, this.ciphertextOffset),
            ciphertext: encryptedBuf.slice(this.ciphertextOffset)
        }

        const decrypted = await eccrypto.decrypt(Buffer.from(privateKey, this.keyFormat).slice(1), encryptedObj)
            .catch(err => console.log(err));

        if (!decrypted)
            return null;

        return JSON.parse(decrypted.toString());
    }
}
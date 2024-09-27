class ed25519 {
    static async #getLibrary() {
        const _sodium = require('libsodium-wrappers');
        await _sodium.ready;
        return _sodium;
    }

    static async encrypt(publicKeyBuf, messageBuf) {
        const sodium = await this.#getLibrary();
        const curve25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(publicKeyBuf.slice(1));
        return Buffer.from(sodium.crypto_box_seal(messageBuf, curve25519PublicKey));
    }

    static async decrypt(privateKeyBuf, encryptedBuf) {
        const sodium = await this.#getLibrary();
        const keyPair = sodium.crypto_sign_seed_keypair(privateKeyBuf.slice(1));
        const curve25519PublicKey_ = sodium.crypto_sign_ed25519_pk_to_curve25519(keyPair.publicKey);
        const curve25519PrivateKey = sodium.crypto_sign_ed25519_sk_to_curve25519(keyPair.privateKey);
        return Buffer.from(sodium.crypto_box_seal_open(encryptedBuf, curve25519PublicKey_, curve25519PrivateKey));
    }
}

class secp256k1 {
    // Offsets of the properties in the encrypted buffer.
    static ivOffset = 65;
    static macOffset = this.ivOffset + 16;
    static ciphertextOffset = this.macOffset + 32;
    
    static #getLibrary() {
        const eccrypto = require('./eccrypto') // Using local copy of the eccrypto code file.
        return eccrypto;
    }

    static async encrypt(publicKeyBuf, messageBuf, options = {}) {
        const eccrypto = this.#getLibrary();
        // For the encryption library, both keys and data should be buffers.
        const encrypted = await eccrypto.encrypt(publicKeyBuf, messageBuf, options);
        // Concat all the properties of the encrypted object to a single buffer.
        return Buffer.concat([encrypted.ephemPublicKey, encrypted.iv, encrypted.mac, encrypted.ciphertext]);
    }

    static async decrypt(privateKeyBuf, encryptedBuf) {
        const eccrypto = this.#getLibrary();
        // Extract the buffer from the string and prepare encrypt object from buffer offsets for decryption.
        const encryptedObj = {
            ephemPublicKey: encryptedBuf.slice(0, this.ivOffset),
            iv: encryptedBuf.slice(this.ivOffset, this.macOffset),
            mac: encryptedBuf.slice(this.macOffset, this.ciphertextOffset),
            ciphertext: encryptedBuf.slice(this.ciphertextOffset)
        }

        const decrypted = await eccrypto.decrypt(privateKeyBuf.slice(1), encryptedObj)
            .catch(err => console.log(err));

        return decrypted;
    }
}

/**
 * EncryptionHelper class is responsible for encrypt and decrypt functions for messages.
 */
class EncryptionHelper {
    static contentFormat = 'base64';
    static keyFormat = 'hex';
    static ed25519KeyType = 'ed25519';
    static secp256k1KeyType = 'ecdsa-secp256k1';

    static #getAlgorithmFromKey(key) {
        const bytes = Buffer.from(key, this.keyFormat);
        return bytes.length === 33 && bytes.at(0) === 0xed
            ? this.ed25519KeyType
            : this.secp256k1KeyType;
    }

    static #getEncryptor(key) {
        const format = this.#getAlgorithmFromKey(key);
        return format === this.secp256k1KeyType ? secp256k1 : ed25519;
    }

    /**
     * Encrypts a message using the given public key.
     * @param {string} publicKey - The public key to use for encryption.
     * @param {Object} message - The message object to be encrypted.
     * @param {Object} [options={}] - Optional encryption parameters.
     * @returns {Promise<string|null>} A promise that resolves to the encrypted message in base64 format, or null if encryption fails.
     */
    static async encrypt(publicKey, message, options = {}) {
        const publicKeyBuf = Buffer.from(publicKey, this.keyFormat);
        const messageBuf = Buffer.from(JSON.stringify(message));
        const encryptor = this.#getEncryptor(publicKey);
        const result = await encryptor.encrypt(publicKeyBuf, messageBuf, options);
        return result ? result.toString(this.contentFormat) : null;
    }

    /**
     * Decrypts an encrypted message using the given private key.
     * @param {string} privateKey - The private key to use for decryption.
     * @param {string} encrypted - The encrypted message string.
     * @returns {Promise<Object|null>} A promise that resolves to the decrypted message as an object, or null if decryption fails.
     */
    static async decrypt(privateKey, encrypted) {
        const privateKeyBuf = Buffer.from(privateKey, this.keyFormat);
        const encryptedBuf = Buffer.from(encrypted, this.contentFormat);
        const encryptor = this.#getEncryptor(privateKey);
        const decrypted = await encryptor.decrypt(privateKeyBuf, encryptedBuf);
        return decrypted ? JSON.parse(decrypted.toString()) : null;
    }
}

module.exports = {
    EncryptionHelper
}
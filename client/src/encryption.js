// /encryption.js
// Utility functions for SecDrop client-side encryption using WebCrypto API

/**
 * Derive a CryptoKey from two inputs (Key A and Key B) using PBKDF2
 * @param {string} keyA - Auto-generated key (Base58)
 * @param {string} keyB - User-provided key (passphrase)
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(keyA, keyB) {
  // Concatenate keys and encode as Uint8Array
  const encoder = new TextEncoder();
  const salt = encoder.encode(keyA);
  const passphrase = encoder.encode(keyB);
  // Import passphrase as key material
  const baseKey = await crypto.subtle.importKey(
    'raw', passphrase, { name: 'PBKDF2' }, false, ['deriveKey']
  );
  // Derive an AES-GCM key
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a File/Blob using AES-GCM
 * @param {Blob} blob - Data to encrypt
 * @param {CryptoKey} key - AES-GCM key
 * @returns {Promise<{ciphertext: ArrayBuffer, iv: Uint8Array}>}
 */
export async function encryptBlob(blob, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await blob.arrayBuffer());
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );
  return { ciphertext, iv };
}

/**
 * Decrypt an ArrayBuffer ciphertext using AES-GCM
 * @param {ArrayBuffer} ciphertext
 * @param {Uint8Array} iv
 * @param {CryptoKey} key
 * @returns {Promise<Uint8Array>} Decrypted data
 */
export async function decryptBlob(ciphertext, iv, key) {
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return new Uint8Array(decrypted);
}

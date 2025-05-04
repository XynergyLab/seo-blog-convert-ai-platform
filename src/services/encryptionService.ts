import CryptoJS from 'crypto-js';

// IMPORTANT: Load the encryption key securely from environment variables.
// DO NOT hardcode the key here. Add VUE_APP_ENCRYPTION_KEY to your .env file.
const ENCRYPTION_KEY = process.env.VUE_APP_ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  console.error('FATAL: VUE_APP_ENCRYPTION_KEY is not set in the environment variables. Encryption/decryption will fail.');
  // Optionally, throw an error to halt execution if the key is mandatory
  // throw new Error('Encryption key is missing.');
}

/**
 * Encrypts a string using AES.
 * @param text The string to encrypt.
 * @returns The encrypted string (ciphertext) or the original text if encryption fails or key is missing.
 */
export function encrypt(text: string): string {
  if (!ENCRYPTION_KEY) {
    console.error('Encryption failed: Encryption key is missing.');
    return text; // Return original text as fallback or handle error appropriately
  }
  try {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption error:', error);
    return text; // Return original text on error
  }
}

/**
 * Decrypts a string using AES.
 * @param ciphertext The encrypted string (ciphertext).
 * @returns The decrypted string (original text) or the ciphertext if decryption fails or key is missing.
 */
export function decrypt(ciphertext: string): string {
  if (!ENCRYPTION_KEY) {
    console.error('Decryption failed: Encryption key is missing.');
    return ciphertext; // Return ciphertext as fallback or handle error appropriately
  }
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    if (!originalText) {
        // This can happen if the key is wrong or the ciphertext is corrupted
        console.error('Decryption failed: Resulting text is empty. Check key or ciphertext integrity.');
        return ciphertext; // Return original ciphertext if decryption results in empty string
    }
    return originalText;
  } catch (error) {
    console.error('Decryption error:', error);
    return ciphertext; // Return original ciphertext on error
  }
}


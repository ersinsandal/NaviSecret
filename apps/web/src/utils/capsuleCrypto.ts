/**
 * NaviSecret Client-Side AES-256-GCM Cryptographic Engine for Secret Capsules
 * Author: Ersin Sandal (SliferSoft)
 */

const ALGO = 'AES-GCM';
const KEY_BITS = 256;
const PBKDF2_ITERATIONS = 100000;

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveCryptoKey(passphrase: string, saltBytes: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const rawKey = encoder.encode(passphrase);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    rawKey,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: ALGO, length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

export interface EncryptedCapsuleData {
  encryptedPayload: string;
  saltEntropy: string;
}

/**
 * Encrypts a message into an AES-GCM payload with client entropy
 * @param plaintext Message content
 * @param secretPasscode Optional creator passcode. If omitted, mode is "Proximity Open" (anyone in radius can read)
 */
export async function encryptCapsuleMessage(
  plaintext: string,
  secretPasscode?: string | null
): Promise<EncryptedCapsuleData> {
  const passphrase = secretPasscode && secretPasscode.trim()
    ? `navisecret:capsule:secret:${secretPasscode.trim()}`
    : `navisecret:capsule:open`;

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveCryptoKey(passphrase, salt);

  const encoder = new TextEncoder();
  const plainBytes = encoder.encode(plaintext);

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: ALGO, iv: iv.buffer as ArrayBuffer },
    key,
    plainBytes.buffer as ArrayBuffer
  );

  const payloadObj = {
    c: toBase64(new Uint8Array(cipherBuffer)),
    iv: toBase64(iv),
    s: toBase64(salt),
  };

  return {
    encryptedPayload: JSON.stringify(payloadObj),
    saltEntropy: toBase64(salt),
  };
}

export interface DecryptResult {
  success: boolean;
  text?: string;
  error?: string;
}

/**
 * Decrypts a verified capsule payload after proximity unlock
 * @param encryptedPayloadStr Serialized AES-GCM payload
 * @param secretPasscode Passcode if required by the capsule
 */
export async function decryptCapsuleMessage(
  encryptedPayloadStr: string,
  secretPasscode?: string | null
): Promise<DecryptResult> {
  try {
    const payload = JSON.parse(encryptedPayloadStr);
    const salt = fromBase64(payload.s);
    const iv = fromBase64(payload.iv);
    const ciphertext = fromBase64(payload.c);

    const passphrase = secretPasscode && secretPasscode.trim()
      ? `navisecret:capsule:secret:${secretPasscode.trim()}`
      : `navisecret:capsule:open`;

    const key = await deriveCryptoKey(passphrase, salt);
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: ALGO, iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext.buffer as ArrayBuffer
    );

    return {
      success: true,
      text: new TextDecoder().decode(decryptedBuffer),
    };
  } catch {
    return {
      success: false,
      error: 'Invalid secret passcode or decryption failed.',
    };
  }
}

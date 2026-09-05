import * as bip39 from 'bip39';

// NOTE ON SECURITY: storing a mnemonic in plain localStorage means any XSS
// on this page, or any browser extension with page access, can read it.
// This is acceptable only for small, "hot wallet" amounts. For anything
// significant, keep it off a browser entirely (hardware wallet, cold storage).

const SEED_KEY = 'triwallet_seed_v1';

export function hasSeed() {
  return !!localStorage.getItem(SEED_KEY);
}

export function generateSeed(strengthBits = 128) {
  // 128 bits -> 12 words, 256 bits -> 24 words
  return bip39.generateMnemonic(strengthBits);
}

export function isValidSeed(mnemonic) {
  return bip39.validateMnemonic(mnemonic.trim().toLowerCase());
}

export function saveSeed(mnemonic) {
  const clean = mnemonic.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!bip39.validateMnemonic(clean)) {
    throw new Error('That seed phrase is not a valid BIP39 mnemonic.');
  }
  localStorage.setItem(SEED_KEY, clean);
  return clean;
}

export function loadSeed() {
  return localStorage.getItem(SEED_KEY);
}

export function clearSeed() {
  localStorage.removeItem(SEED_KEY);
}

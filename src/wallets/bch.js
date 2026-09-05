import { Wallet } from 'mainnet-js';

// mainnet-js derives BCH addresses from a BIP39 seed using the standard
// BCH BIP44 path (m/44'/145'/0'/0/0) by default. This is a *different*
// address than the BTC tab, but the same underlying seed phrase.
//
// NOTE: verify against the installed mainnet-js version's docs
// (https://mainnet.cash) if this API has changed — this project pins
// ^2.2.4 but mainnet-js has moved fast historically.

let cachedWallet = null;
let cachedMnemonic = null;

export async function getBchWallet(mnemonic) {
  if (cachedWallet && cachedMnemonic === mnemonic) return cachedWallet;
  cachedWallet = await Wallet.fromSeed(mnemonic);
  cachedMnemonic = mnemonic;
  return cachedWallet;
}

export async function getAddress(mnemonic) {
  const wallet = await getBchWallet(mnemonic);
  return wallet.getDepositAddress();
}

export async function getBalance(mnemonic) {
  const wallet = await getBchWallet(mnemonic);
  return wallet.getBalance(); // { sat, bch, usd }
}

export async function sendBch(mnemonic, toCashaddr, amountSat) {
  const wallet = await getBchWallet(mnemonic);
  const result = await wallet.send([{ cashaddr: toCashaddr, value: amountSat, unit: 'sat' }]);
  return result.txId;
}

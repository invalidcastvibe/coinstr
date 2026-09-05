import init, { defaultConfig, connect } from '@breeztech/breez-sdk-liquid';

// Lightning is fundamentally different from BCH/BTC: there's no address you
// derive offline. This uses Breez SDK - Liquid, a *non-custodial* SDK that
// uses your seed phrase plus submarine swaps against the Liquid sidechain to
// send/receive Lightning payments without you running a node.
//
// You need a free Breez API key: https://breez.technology/request-api-key/
// The API surface below matches the docs at sdk-doc-liquid.breez.technology
// as of this writing (SDK ~0.8.x). Breez ships new versions fairly often —
// if a call here throws "not a function" or similar, check that page for
// the current method names/shapes before trusting it with real funds.

const API_KEY_STORAGE = 'triwallet_breez_api_key_v1';

export function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

export function getApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

let sdkInstance = null;
let connectedMnemonic = null;
let initialized = false;

export async function connectLightning(mnemonic) {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('Set your Breez API key in Settings first.');

  if (sdkInstance && connectedMnemonic === mnemonic) return sdkInstance;

  if (sdkInstance && connectedMnemonic !== mnemonic) {
    await sdkInstance.disconnect().catch(() => {});
    sdkInstance = null;
  }

  if (!initialized) {
    await init(); // loads the wasm module, only needs to run once per page load
    initialized = true;
  }

  const config = defaultConfig('mainnet', apiKey);
  sdkInstance = await connect({ mnemonic, config });
  connectedMnemonic = mnemonic;
  return sdkInstance;
}

export async function getLightningBalanceSats(mnemonic) {
  const sdk = await connectLightning(mnemonic);
  const info = await sdk.getInfo();
  return info.walletInfo.balanceSat;
}

export async function createInvoice(mnemonic, amountSat, description = '') {
  const sdk = await connectLightning(mnemonic);
  const prepareResponse = await sdk.prepareReceivePayment({
    payerAmountSat: amountSat,
    paymentMethod: 'lightning'
  });
  const receiveResponse = await sdk.receivePayment({ prepareResponse, description });
  return { invoice: receiveResponse.destination, feesSat: prepareResponse.feesSat };
}

export async function payInvoice(mnemonic, bolt11) {
  const sdk = await connectLightning(mnemonic);
  const prepareResponse = await sdk.prepareSendPayment({ destination: bolt11 });
  const sendResponse = await sdk.sendPayment({ prepareResponse });
  return { feesSat: prepareResponse.feesSat, payment: sendResponse.payment };
}

export async function disconnectLightning() {
  if (sdkInstance) {
    await sdkInstance.disconnect().catch(() => {});
    sdkInstance = null;
    connectedMnemonic = null;
  }
}

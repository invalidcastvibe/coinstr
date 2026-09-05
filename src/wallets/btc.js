import * as bitcoin from 'bitcoinjs-lib';
import { BIP32Factory } from 'bip32';
import * as ecc from 'tiny-secp256k1';
import * as bip39 from 'bip39';

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const NETWORK = bitcoin.networks.bitcoin; // mainnet
const PATH = "m/84'/0'/0'/0/0"; // BIP84 native segwit, first receive address
const API = 'https://blockstream.info/api';
const DUST_SAT = 546;

function deriveNode(mnemonic) {
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const root = bip32.fromSeed(seed, NETWORK);
  return root.derivePath(PATH);
}

export function getAddress(mnemonic) {
  const node = deriveNode(mnemonic);
  const { address } = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network: NETWORK });
  return address;
}

export async function getBalanceSats(address) {
  const res = await fetch(`${API}/address/${address}`);
  if (!res.ok) throw new Error(`Failed to fetch BTC balance (${res.status})`);
  const d = await res.json();
  const confirmed = d.chain_stats.funded_txo_sum - d.chain_stats.spent_txo_sum;
  const unconfirmed = d.mempool_stats.funded_txo_sum - d.mempool_stats.spent_txo_sum;
  return confirmed + unconfirmed;
}

export async function getUtxos(address) {
  const res = await fetch(`${API}/address/${address}/utxo`);
  if (!res.ok) throw new Error(`Failed to fetch UTXOs (${res.status})`);
  return res.json();
}

export async function getRecommendedFeeRate() {
  try {
    const res = await fetch(`${API}/fee-estimates`);
    const d = await res.json();
    // Target ~6 blocks; fall back to 5 sat/vB if unavailable
    return Math.ceil(d['6'] || 5);
  } catch {
    return 5;
  }
}

// Rough vsize estimate for a P2WPKH tx: 10.5 (overhead) + 68*inputs + 31*outputs, in vbytes
function estimateVBytes(numInputs, numOutputs) {
  return Math.ceil(10.5 + numInputs * 68 + numOutputs * 31);
}

/**
 * Sends BTC from the derived address, with naive oldest-first coin selection
 * and a single change output back to the same address.
 */
export async function sendBtc(mnemonic, toAddress, amountSats, feeRateSatPerVb) {
  const node = deriveNode(mnemonic);
  const { address: fromAddress, output } = bitcoin.payments.p2wpkh({ pubkey: node.publicKey, network: NETWORK });
  const feeRate = feeRateSatPerVb || (await getRecommendedFeeRate());

  const utxos = await getUtxos(fromAddress);
  if (!utxos.length) throw new Error('No spendable BTC UTXOs at this address.');

  const selected = [];
  let inputSum = 0;
  for (const u of utxos) {
    selected.push(u);
    inputSum += u.value;
    const fee = estimateVBytes(selected.length, 2) * feeRate;
    if (inputSum >= amountSats + fee) break;
  }
  const fee = estimateVBytes(selected.length, 2) * feeRate;
  if (inputSum < amountSats + fee) {
    throw new Error(`Insufficient BTC balance: need ~${amountSats + fee} sats (incl. fee), have ${inputSum} sats.`);
  }

  const psbt = new bitcoin.Psbt({ network: NETWORK });
  for (const u of selected) {
    psbt.addInput({
      hash: u.txid,
      index: u.vout,
      witnessUtxo: { script: output, value: u.value }
    });
  }
  psbt.addOutput({ address: toAddress, value: amountSats });

  const change = inputSum - amountSats - fee;
  if (change > DUST_SAT) {
    psbt.addOutput({ address: fromAddress, value: change });
  }

  selected.forEach((_, i) => psbt.signInput(i, node));
  psbt.finalizeAllInputs();
  const txHex = psbt.extractTransaction().toHex();

  const res = await fetch(`${API}/tx`, { method: 'POST', body: txHex });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Broadcast failed: ${errText}`);
  }
  return res.text(); // txid
}

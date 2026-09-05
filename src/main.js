import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;

import * as seed from './seed.js';
import * as btc from './wallets/btc.js';
import * as bch from './wallets/bch.js';
import * as ln from './wallets/lightning.js';

const $ = (id) => document.getElementById(id);

// ---------- screen switching ----------
function showScreen(name) {
  ['seedScreen', 'settingsScreen', 'walletScreen'].forEach((id) => {
    $(id).classList.toggle('hidden', id !== name);
  });
}

function currentMnemonic() {
  return seed.loadSeed();
}

// ---------- seed setup screen ----------
$('genSeedBtn').addEventListener('click', () => {
  const mnemonic = seed.generateSeed(128);
  $('newSeedDisplay').textContent = mnemonic;
  $('newSeedBox').classList.remove('hidden');
  $('seedChoice').classList.add('hidden');
  $('importBox').classList.add('hidden');
  $('newSeedBox').dataset.pending = mnemonic;
});

$('showImportBtn').addEventListener('click', () => {
  $('importBox').classList.remove('hidden');
  $('seedChoice').classList.add('hidden');
});

$('importBtn').addEventListener('click', () => {
  try {
    seed.saveSeed($('importInput').value);
    initWalletScreen();
  } catch (e) {
    alert(e.message);
  }
});

$('confirmBackup').addEventListener('change', (e) => {
  $('confirmSeedBtn').disabled = !e.target.checked;
});

$('confirmSeedBtn').addEventListener('click', () => {
  const mnemonic = $('newSeedBox').dataset.pending;
  seed.saveSeed(mnemonic);
  initWalletScreen();
});

// ---------- settings screen ----------
$('settingsBtn').addEventListener('click', () => {
  $('breezApiKeyInput').value = ln.getApiKey();
  showScreen('settingsScreen');
});

$('closeSettingsBtn').addEventListener('click', () => showScreen('walletScreen'));

$('saveApiKeyBtn').addEventListener('click', () => {
  ln.saveApiKey($('breezApiKeyInput').value);
  alert('Saved.');
});

$('revealSeedBtn').addEventListener('click', () => {
  const box = $('revealSeedBox');
  if (box.classList.contains('hidden')) {
    box.textContent = currentMnemonic() || '(none)';
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
});

$('wipeBtn').addEventListener('click', () => {
  if (!confirm('This deletes the seed phrase from this browser. Make sure you have it backed up. Continue?')) return;
  seed.clearSeed();
  location.reload();
});

// ---------- tabs ----------
document.querySelectorAll('.tab-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.remove('active'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.add('active');
  });
});

// ---------- BCH ----------
async function refreshBch() {
  const mnemonic = currentMnemonic();
  $('bchAddress').textContent = 'loading...';
  $('bchBalance').textContent = '...';
  try {
    $('bchAddress').textContent = await bch.getAddress(mnemonic);
    const balance = await bch.getBalance(mnemonic);
    $('bchBalance').textContent = `${balance.bch} BCH`;
  } catch (e) {
    $('bchBalance').textContent = 'error';
    console.error(e);
  }
}

$('bchRefresh').addEventListener('click', refreshBch);

$('bchSendBtn').addEventListener('click', async () => {
  const mnemonic = currentMnemonic();
  const to = $('bchToAddress').value.trim();
  const amountBch = parseFloat($('bchAmount').value);
  if (!to || !amountBch) return alert('Enter a recipient address and amount.');
  const amountSat = Math.round(amountBch * 1e8);
  $('bchStatus').textContent = 'Sending...';
  try {
    const txId = await bch.sendBch(mnemonic, to, amountSat);
    $('bchStatus').textContent = `Sent. txid: ${txId}`;
    refreshBch();
  } catch (e) {
    $('bchStatus').textContent = `Error: ${e.message}`;
  }
});

// ---------- BTC ----------
async function refreshBtc() {
  const mnemonic = currentMnemonic();
  const address = btc.getAddress(mnemonic);
  $('btcAddress').textContent = address;
  $('btcBalance').textContent = '...';
  try {
    const sats = await btc.getBalanceSats(address);
    $('btcBalance').textContent = `${sats.toLocaleString()} sats`;
  } catch (e) {
    $('btcBalance').textContent = 'error';
    console.error(e);
  }
}

$('btcRefresh').addEventListener('click', refreshBtc);

$('btcSendBtn').addEventListener('click', async () => {
  const mnemonic = currentMnemonic();
  const to = $('btcToAddress').value.trim();
  const amountSats = parseInt($('btcAmount').value, 10);
  const feeRate = parseInt($('btcFeeRate').value, 10) || undefined;
  if (!to || !amountSats) return alert('Enter a recipient address and amount in sats.');
  $('btcStatus').textContent = 'Sending...';
  try {
    const txId = await btc.sendBtc(mnemonic, to, amountSats, feeRate);
    $('btcStatus').textContent = `Sent. txid: ${txId}`;
    refreshBtc();
  } catch (e) {
    $('btcStatus').textContent = `Error: ${e.message}`;
  }
});

// ---------- Lightning ----------
async function refreshLn() {
  const mnemonic = currentMnemonic();
  $('lnBalance').textContent = '...';
  try {
    const sats = await ln.getLightningBalanceSats(mnemonic);
    $('lnBalance').textContent = `${sats.toLocaleString()} sats`;
  } catch (e) {
    $('lnBalance').textContent = 'error';
    console.error(e);
  }
}

$('lnRefresh').addEventListener('click', refreshLn);

$('lnCreateInvoiceBtn').addEventListener('click', async () => {
  const mnemonic = currentMnemonic();
  const amountSat = parseInt($('lnReceiveAmount').value, 10);
  const description = $('lnReceiveDesc').value.trim();
  if (!amountSat) return alert('Enter an amount in sats.');
  $('lnInvoiceOut').textContent = 'Creating invoice...';
  try {
    const { invoice, feesSat } = await ln.createInvoice(mnemonic, amountSat, description);
    $('lnInvoiceOut').textContent = `${invoice}\n\n(fee: ${feesSat} sats)`;
  } catch (e) {
    $('lnInvoiceOut').textContent = `Error: ${e.message}`;
  }
});

$('lnPayBtn').addEventListener('click', async () => {
  const mnemonic = currentMnemonic();
  const bolt11 = $('lnInvoiceInput').value.trim();
  if (!bolt11) return alert('Paste a bolt11 invoice.');
  $('lnStatus').textContent = 'Paying...';
  try {
    const { feesSat } = await ln.payInvoice(mnemonic, bolt11);
    $('lnStatus').textContent = `Paid. Fee: ${feesSat} sats`;
    refreshLn();
  } catch (e) {
    $('lnStatus').textContent = `Error: ${e.message}`;
  }
});

// ---------- boot ----------
function initWalletScreen() {
  showScreen('walletScreen');
  refreshBch();
  refreshBtc();
  // Lightning isn't auto-connected on load since it needs an API key and
  // does a network round-trip; user hits Refresh once they've set a key.
}

function boot() {
  if (seed.hasSeed()) {
    initWalletScreen();
  } else {
    showScreen('seedScreen');
  }
}

boot();

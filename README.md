# Tri-Wallet — BCH / BTC / Lightning from one seed phrase

A single BIP39 seed phrase drives three wallets:

- **BCH** — derived client-side, balance/send via [mainnet-js](https://mainnet.cash)
- **BTC** — derived client-side (BIP84 native segwit), balance/send via the public
  [Blockstream Esplora API](https://blockstream.info/api)
- **Lightning** — non-custodial, via [Breez SDK - Liquid](https://sdk-doc-liquid.breez.technology),
  which uses submarine swaps against the Liquid sidechain so there's no node/channels to manage

The seed phrase (and your Breez API key) live in the browser's `localStorage`, per your request.

## Read this before putting real money in

- **`localStorage` is not a vault.** Any script that runs on this page — a malicious
  browser extension, an XSS bug, a compromised dependency — can read your seed phrase
  and take everything across all three wallets. This is a "hot wallet" pattern, suitable
  for small, spendable amounts, not long-term savings.
- **This code has not been security-audited.** I've built it to be correct and followed
  each library's current docs, but I can't run it end-to-end in the sandbox I wrote it in
  (no network access there) — I haven't executed a real transaction with it. Test with
  small amounts on mainnet, or point the BTC/Lightning config at testnet first if you want
  a completely risk-free dry run, before trusting it with anything you'd mind losing.
- **Serve it over HTTPS, from a domain only you control.** Don't run this on shared/public
  hosting where others can push code to the same origin.
- **Back up the seed phrase offline** (paper, metal backup) the moment it's generated —
  it's shown once during setup.
- One seed phrase, three ledgers: BCH and BTC use different derivation paths from the
  same seed and get **different addresses**. Lightning balance lives on Liquid, not on
  Bitcoin or BCH directly. Don't send BCH to the BTC address or vice versa.

## Setup

```bash
npm install
npm run dev
```

Open the printed local URL. On first load you'll be asked to generate a new seed phrase
or import an existing BIP39 one.

### Lightning setup

Lightning needs a free Breez API key:

1. Request one at <https://breez.technology/request-api-key/>
2. In the app, tap the ⚙ settings icon and paste it in

Without a key, the BCH and BTC tabs work fine; the Lightning tab will show an error until
a key is set.

## Project layout

```
index.html            UI shell (seed setup / settings / wallet tabs)
src/main.js            DOM wiring
src/seed.js             BIP39 generate/import/localStorage
src/wallets/btc.js       address derivation + Esplora balance/send
src/wallets/bch.js       mainnet-js wrapper
src/wallets/lightning.js Breez SDK - Liquid wrapper
```

## Known limitations / things to double-check before relying on this

- **BTC coin selection is naive** (oldest-first, single change output, rough vsize
  estimate for fees). It works but isn't optimized, and doesn't support RBF.
- **Breez SDK's JS API moves between versions.** I pulled the exact call shapes from
  their current docs (`sdk-doc-liquid.breez.technology`) as of writing, but if a method
  in `lightning.js` throws `is not a function`, check that page — the SDK is under active
  development.
- **No transaction history view yet** — only current balance and send/receive. Blockstream's
  API (`/address/{addr}/txs`) and mainnet-js's `wallet.getHistory()`/Breez's `sdk.listPayments()`
  can be wired in if you want that next.
- Only the first receive address per chain is derived (no address rotation/gap-limit
  scanning). Funds sent to a different address in the same wallet (e.g. from an old
  wallet using a different derivation index) won't show up automatically.

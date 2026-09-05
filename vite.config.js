import { defineConfig } from 'vite';
import wasm from 'vite-plugin-wasm';
import topLevelAwait from 'vite-plugin-top-level-await';

// bitcoinjs-lib / bip39 / mainnet-js expect Node's Buffer to exist globally.
// We polyfill it via vite-plugin-node-polyfills-style manual define + alias.
export default defineConfig({
  plugins: [wasm(), topLevelAwait()],
  define: {
    global: 'globalThis'
  },
  resolve: {
    alias: {
      buffer: 'buffer'
    }
  },
  optimizeDeps: {
    exclude: ['@breeztech/breez-sdk-liquid'],
    esbuildOptions: {
      define: { global: 'globalThis' }
    }
  }
});

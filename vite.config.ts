import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import wasm from 'vite-plugin-wasm';
import { visualizer } from 'rollup-plugin-visualizer';

import path from 'path';
import { fileURLToPath } from 'url';

import {
  serviceWorkerPlugin,
  minifyLitCssPlugin,
  minifyLitHtmlPlugin,
  inlineMdTokensPlugin,
  injectModulepreloadPlugin,
  htmlMinifierPlugin,
} from './build/plugins';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Build version - shared between main app and service worker
const BUILD_VERSION = new Date().toISOString();

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  css: {
    transformer: 'postcss',
  },
  worker: {
    format: 'es',
  },
  build: {
    sourcemap: false,
    assetsDir: 'code',
    cssCodeSplit: true,
    minify: 'terser',
    modulePreload: false,
    target: 'esnext',
    terserOptions: {
      module: true,
      toplevel: true,
      compress: {
        ecma: 2020,
        drop_console: false,
        drop_debugger: true,
        pure_funcs: ['console.log'], // Strip console.log but keep warn/error
        passes: 3,
        arrows: true,
        booleans_as_integers: true,
        collapse_vars: true,
        comparisons: true,
        dead_code: true,
        hoist_vars: false,
        inline: 3,
        unsafe: false,
        unsafe_arrows: true,
        unsafe_Function: false,
        unsafe_methods: true,
        unsafe_proto: false,
        unsafe_regexp: false,
        unsafe_undefined: true,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
        ecma: 2020,
      },
      keep_classnames: false,
      keep_fnames: false,
    },

    // Create dedicated vendor chunks for parallel fetching and caching.
    // Service worker is built separately by the service-worker plugin.
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      plugins: [],
      output: {
        manualChunks(id) {
          if (id.includes('src/utils/perf-observer')) {
            return 'perf-observer';
          }

          if (id.includes('pages/app-login')) {
            return 'app-login';
          }

          if (id.includes('md-tab')) {
            return 'md-tabs';
          }

          if (id.includes('node_modules')) {
            if (
              id.includes('/node_modules/lit') ||
              id.includes('/node_modules/@lit')
            ) {
              return 'vendor-lit';
            }

            if (id.includes('/node_modules/idb-keyval')) {
              return 'vendor-idb-keyval';
            }

            if (id.includes('/web-router')) {
              return 'vendor-web-router';
            }
          }
        },
      },
    },
  },
  plugins: [
    ...serviceWorkerPlugin(__dirname, BUILD_VERSION),
    minifyLitCssPlugin(),
    minifyLitHtmlPlugin(),
    inlineMdTokensPlugin(__dirname),
    injectModulepreloadPlugin(),
    htmlMinifierPlugin(),
    wasm(),
    checker({
      typescript: true,
    }),
    ...(process.env.ANALYZE_BUNDLE ? [visualizer({ open: true })] : []),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
});

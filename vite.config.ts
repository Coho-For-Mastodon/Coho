import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import copy from 'rollup-plugin-copy';
import wasm from 'vite-plugin-wasm';
import { visualizer } from 'rollup-plugin-visualizer';

let customPlugins = [];
// Plugin to minify CSS in Lit component tagged templates
// Note: This handles any remaining inline css`` templates
// External .css files are automatically minified by Vite's built-in CSS processing
customPlugins.push({
  name: 'minify-lit-css',
  enforce: 'pre',
  transform(code: string, id: string) {
    // Only process TypeScript/JavaScript files
    if (!/\.(ts|js|tsx|jsx)$/.test(id)) return null;

    // Only process files that likely contain Lit css`` templates
    if (!code.includes('.styles') && !code.includes('css`')) return null;

    // Minify CSS inside css`` tagged templates
    const minified = code.replace(/css`([\s\S]*?)`/g, (match, css) => {
      const minifiedCss = css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\n\s*/g, '') // Remove newlines and leading whitespace
        .replace(/\s*([{}:;,])\s*/g, '$1') // Remove whitespace around CSS syntax
        .replace(/;\}/g, '}') // Remove last semicolon before closing brace
        .replace(/\s+/g, ' ') // Collapse multiple spaces
        .trim();
      return `css\`${minifiedCss}\``;
    });

    if (minified !== code) {
      return { code: minified, map: null };
    }

    return null;
  },
});

// Plugin to minify HTML
customPlugins.push({
  name: 'html-minifier',
  enforce: 'post',
  transformIndexHtml(html) {
    // Minify CSS inside <style> tags
    html = html.replace(
      /<style>([\s\S]*?)<\/style>/g,
      (match: any, css: any) => {
        const minifiedCss = css
          .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
          .replace(/\n\s*/g, '') // Remove newlines and leading whitespace
          .replace(/\s*([{}:;,])\s*/g, '$1') // Remove whitespace around CSS syntax
          .replace(/;\}/g, '}') // Remove last semicolon before closing brace
          .replace(/\s+/g, ' ') // Collapse multiple spaces
          .trim();
        return `<style>${minifiedCss}</style>`;
      }
    );

    // Minify HTML structure
    return html
      .replace(/\n\s+/g, '\n') // Remove leading whitespace
      .replace(/\n+/g, '\n') // Collapse multiple newlines
      .replace(/>\s+</g, '><') // Remove whitespace between tags
      .replace(/\s{2,}/g, ' ') // Collapse multiple spaces
      .trim();
  },
});

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  build: {
    sourcemap: false,
    assetsDir: 'code',
    cssCodeSplit: true,
    minify: 'terser',
    target: ['esnext', 'edge140', 'firefox120', 'chrome140', 'safari19'],
    terserOptions: {
      module: true,
      compress: {
        drop_console: true,
        drop_debugger: true,
        passes: 2,
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
        unsafe_undefined: false,
      },
      mangle: {
        safari10: true,
      },
      format: {
        comments: false,
      },
      keep_classnames: false,
      keep_fnames: false,
    },

    // Create a dedicated vendor chunk for lit so it can be fetched in parallel
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      output: {
        entryFileNames: 'code/[name].js',
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (
              id.includes('/node_modules/lit') ||
              id.includes('/node_modules/@lit')
            ) {
              return 'vendor-lit';
            }
          }
        },
      },
    },
  },
  plugins: [
    ...customPlugins,
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: {
        swSrc: 'src/sw.ts',
        swDest: 'dist/sw.js',
        globDirectory: 'dist',
        globPatterns: ['**/*.{js,css,html}'],
        // Don't include these in the precache
        // Note: index.html IS included (by not being ignored) to support the App Shell strategy
        globIgnores: ['**/node_modules/**/*'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
      },
      injectRegister: false,
      manifest: false,
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
      },
    }),
    wasm(),
    copy({
      targets: [
        { src: 'dark.css', dest: 'dist/' },
        { src: 'src/styles/md-tokens.css', dest: 'dist/code/' },
      ],
    }),
    ...(process.env.ANALYZE_BUNDLE ? [visualizer({ open: true })] : []),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(new Date().toISOString()),
  },
});

import { defineConfig, build } from 'vite';
import checker from 'vite-plugin-checker';
import copy from 'rollup-plugin-copy';
import wasm from 'vite-plugin-wasm';
import { visualizer } from 'rollup-plugin-visualizer';
import typescript from '@rollup/plugin-typescript';
import { compileLitTemplates } from '@lit-labs/compiler';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const customPlugins = [];

// Build version - shared between main app and service worker
const BUILD_VERSION = new Date().toISOString();

// Plugin to build the service worker in dev mode
customPlugins.push({
  name: 'dev-service-worker',
  apply: 'serve',
  async buildStart() {
    const { build } = await import('vite');
    console.log('[dev-sw] Building service worker for dev...');
    await build({
      configFile: false,
      build: {
        emptyOutDir: false,
        outDir: 'public',
        lib: {
          entry: path.resolve(__dirname, 'src/sw.ts'),
          formats: ['es'],
          fileName: () => 'sw.js',
        },
        rollupOptions: {
          output: {
            inlineDynamicImports: true,
          },
        },
        minify: false,
      },
      define: {
        '__APP_VERSION__': JSON.stringify(BUILD_VERSION),
        'process.env.NODE_ENV': JSON.stringify('development'),
      },
    });
    console.log('[dev-sw] Service worker built successfully');
  },
});

// Plugin to build the service worker as a self-contained bundle
// Service workers need all dependencies inlined to avoid import issues
customPlugins.push({
  name: 'build-sw',
  apply: 'build',
  async closeBundle() {
    console.log('[build-sw] Building service worker...');
    await build({
      configFile: false,
      build: {
        emptyOutDir: false,
        outDir: 'dist',
        lib: {
          entry: path.resolve(__dirname, 'src/sw.ts'),
          formats: ['es'],
          fileName: () => 'sw.js',
        },
        rollupOptions: {
          output: {
            // Inline all imports - critical for service workers
            inlineDynamicImports: true,
          },
          plugins: [
            typescript({
              compilerOptions: {
                declaration: false,
                declarationMap: false,
              },
              transformers: {
                before: [compileLitTemplates()],
              },
            }),
          ],
        },
        minify: 'terser',
        terserOptions: {
          module: true,
          compress: {
            drop_console: false, // Keep console logs in SW for debugging
            drop_debugger: true,
          },
          format: {
            comments: false,
          },
        },
      },
      define: {
        '__APP_VERSION__': JSON.stringify(BUILD_VERSION),
        'process.env.NODE_ENV': JSON.stringify('production'),
      },
    });
    console.log('[build-sw] Service worker built successfully');
  },
});
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

// Plugin to minify HTML in Lit component tagged templates
customPlugins.push({
  name: 'minify-lit-html',
  enforce: 'pre',
  transform(code: string, id: string) {
    // Only process TypeScript/JavaScript files
    if (!/\.(ts|js|tsx|jsx)$/.test(id)) return null;

    // Only process files that contain Lit html`` templates
    if (!code.includes('html`')) return null;

    // Minify HTML inside html`` tagged templates
    // Be careful to preserve template expressions ${...}
    const minified = code.replace(/html`([\s\S]*?)`/g, (match, html) => {
      const minifiedHtml = html
        .replace(/<!--[\s\S]*?-->/g, '') // Remove HTML comments
        .replace(/>\s+</g, '><') // Remove whitespace between tags
        .replace(/\s+/g, ' ') // Collapse multiple whitespace to single space
        .replace(/>\s+\$/g, '>$') // Remove space before template expressions after >
        .replace(/\$\s+</g, '$<') // Remove space after template expressions before <
        .replace(/"\s+>/g, '">') // Remove space before > after attribute value
        .replace(/'\s+>/g, "'>") // Remove space before > after single-quoted attribute
        .trim();
      return `html\`${minifiedHtml}\``;
    });

    if (minified !== code) {
      return { code: minified, map: null };
    }

    return null;
  },
});

// Plugin to inject modulepreload for critical chunks
customPlugins.push({
  name: 'inject-modulepreload',
  enforce: 'post',
  apply: 'build',
  transformIndexHtml: {
    order: 'post',
    handler(html: string, { bundle }: { bundle?: Record<string, unknown> }) {
      if (!bundle) return html;

      const chunksToPreload = [
        'auth-session',
        'vendor-idb-keyval',
        'firebase-',
      ];
      const preloadLinks: string[] = [];

      for (const chunkPattern of chunksToPreload) {
        const chunk = Object.keys(bundle).find(
          (name) => name.includes(chunkPattern) && name.endsWith('.js')
        );
        if (chunk) {
          preloadLinks.push(`<link rel="modulepreload" href="/${chunk}" />`);
        }
      }

      if (preloadLinks.length > 0) {
        html = html.replace('<head>', `<head>${preloadLinks.join('')}`);
      }

      return html;
    },
  },
});

// Plugin to minify HTML
customPlugins.push({
  name: 'html-minifier',
  enforce: 'post',
  transformIndexHtml(html: string) {
    // Minify CSS inside <style> tags
    html = html.replace(
      /<style>([\s\S]*?)<\/style>/g,
      (match: string, css: string) => {
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
  css: {
    transformer: 'postcss',
  },
  worker: {
    format: 'es',
  },
  build: {
    sourcemap: false,
    polyfillModulePreload: false,
    assetsDir: 'code',
    cssCodeSplit: true,
    minify: 'terser',
    modulePreload: { polyfill: false },
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

    // Create a dedicated vendor chunk for lit so it can be fetched in parallel
    // Note: Service worker is built separately by the build-sw plugin to ensure all deps are inlined
    rollupOptions: {
      input: {
        main: 'index.html',
      },
      plugins: [
        typescript({
          compilerOptions: {
            declaration: false,
            declarationMap: false,
          },
          transformers: {
            before: [compileLitTemplates()],
          },
        }),
      ],
      output: {
        manualChunks(id) {
          if (id.includes('src/utils/perf-observer')) {
            return 'perf-observer';
          }

          if (id.includes('pages/app-login')) {
            return 'app-login';
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

            // Keep tslib in a dedicated chunk so shared TypeScript helper code can
            // be cached independently instead of being duplicated across vendor bundles.
            if (id.includes('/node_modules/tslib')) {
              return 'vendor-tslib';
            }
          }
        },
      },
    },
  },
  plugins: [
    ...customPlugins,
    wasm(),
    checker({
      typescript: true,
    }),
    copy({
      targets: [
        { src: 'dark.css', dest: 'dist/' },
        { src: 'src/styles/md-tokens.css', dest: 'dist/code/' },
      ],
    }),
    ...(process.env.ANALYZE_BUNDLE ? [visualizer({ open: true })] : []),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(BUILD_VERSION),
  },
});

/**
 * SSR Script for app-login component
 *
 * This script pre-renders the app-login component using Lit SSR and outputs
 * the serialized HTML with Declarative Shadow DOM for insertion into index.html.
 *
 * Usage: node --experimental-vm-modules scripts/ssr-login.mjs [--inject]
 *   --inject: Also inject the pre-rendered content into dist/index.html
 *
 * NOTE: This script must run AFTER `vite build` since it imports the compiled JS.
 */

import { render } from '@lit-labs/ssr';
import { html } from 'lit';
import { Readable } from 'stream';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Define Vite build-time constants for SSR context
globalThis.__APP_VERSION__ = Date.now();

/**
 * Collect rendered stream into a string
 */
async function streamToString(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? chunk : chunk.toString());
  }
  return chunks.join('');
}

/**
 * Pre-render the app-login component using actual Lit SSR
 * This renders the full component tree with DSD for all nested Lit components
 */
async function renderLoginComponent() {
  // Import components from compiled source (TypeScript)
  // tsx loader handles the TS->JS transformation
  await import('../src/components/md/md-button.js');
  await import('../src/components/md/md-autocomplete.js');
  await import('../src/pages/app-login.js');

  // Render the component - Lit SSR will traverse the entire tree
  // and generate DSD for all nested Lit components
  const result = render(html`<app-login></app-login>`);

  // Convert the render result to a string
  const rendered = await streamToString(Readable.from(result));

  return rendered;
}

/**
 * Extract just the inner content from the rendered app-login for light DOM injection
 * This creates a static HTML snapshot that will be replaced when JS loads
 */
function extractLightDomContent() {
  // Return a static HTML structure that matches the visual output
  // This is displayed before hydration and provides instant LCP
  return `
    <template shadowrootmode="open">
      <style>
        :host {
          display: block;
          --md-sys-color-surface-container: #f0f4f8;
        }

        @media (prefers-color-scheme: dark) {
          :host {
            --md-sys-color-surface-container: #1a1c1e;
          }
        }

        main {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          width: 100%;
          background-color: var(--md-sys-color-surface-container);
          padding: 20px;
          box-sizing: border-box;
          position: relative;
          overflow: hidden;
        }

        .login-card {
          max-width: 400px;
          width: 100%;
          z-index: 1;
          padding: 32px;
        }

        .login-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          margin-bottom: 24px;
        }

        h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 500;
          color: var(--md-sys-color-on-surface);
        }

        .subtitle {
          margin: 8px 0 0;
          font-size: 14px;
          color: var(--md-sys-color-on-surface-variant);
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
          align-items: center;
        }

        .login-button {
          --md-button-height: 48px;
        }

        .login-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: center;
          width: 100%;
        }

        .app-footer {
          margin-top: 24px;
          font-size: 12px;
          color: var(--md-sys-color-on-surface-variant);
          z-index: 1;
          text-align: center;
        }

        .app-footer a {
          color: inherit;
          text-decoration: none;
        }

        .app-footer a:hover {
          text-decoration: underline;
        }

        @media (max-width: 820px) {
          .login-card {
            box-shadow: none;
            background: transparent;
            border: none;
          }

          main {
            justify-content: flex-start;
            padding-top: 40px;
          }
        }
      </style>
      <main>
        <div class="login-card">
          <div class="login-header">
            <h1>Welcome to Coho</h1>
            <p class="subtitle">Your modern Mastodon client</p>
          </div>

          <div class="login-form">
            <md-autocomplete placeholder="Search for your server (e.g. mastodon.social)"></md-autocomplete>
            <md-button variant="filled" class="login-button">Login</md-button>
          </div>

          <div class="login-actions">
            <md-button variant="text">Sign up for Mastodon Account</md-button>
            <md-button variant="text">Try Coho without an account</md-button>
          </div>
        </div>

        <div class="app-footer">
          <a href="https://github.com/jgw96/mammoth-app#readme" target="_blank">
            Learn More about Coho
          </a>
        </div>
      </main>
    </template>`;
}

/**
 * Generate a minimal pre-rendered login shell for faster LCP
 * This is a simpler approach that doesn't require full Lit SSR compilation
 */
function generateStaticLoginShell() {
  return `<app-login>${extractLightDomContent()}</app-login>`;
}

/**
 * Inject pre-rendered content into dist/index.html
 */
async function injectIntoDistHtml(prerenderedHtml) {
  const distIndexPath = join(rootDir, 'dist', 'index.html');

  try {
    let indexHtml = await readFile(distIndexPath, 'utf-8');

    // Find the app-index element and inject the SSR shell BEFORE it
    // The shell is hidden once app-index renders (using :has selector)
    const appIndexRegex = /<app-index><\/app-index>/;

    if (appIndexRegex.test(indexHtml)) {
      // Inject SSR shell before app-index
      // A small inline script removes it once app-index has content (JS has taken over)
      indexHtml = indexHtml.replace(
        appIndexRegex,
        `<div id="ssr-shell">${prerenderedHtml}</div>
<app-index></app-index>
<script>
// Remove SSR shell once app-index renders (JS has taken over)
new MutationObserver((_, obs) => {
  const appIndex = document.querySelector('app-index');
  if (appIndex && appIndex.children.length > 0) {
    document.getElementById('ssr-shell')?.remove();
    obs.disconnect();
  }
}).observe(document.querySelector('app-index'), { childList: true });
</script>`
      );

      await writeFile(distIndexPath, indexHtml, 'utf-8');
      console.log('✅ Injected pre-rendered login into dist/index.html');
    } else {
      console.warn(
        '⚠️  Could not find <app-index></app-index> in dist/index.html'
      );
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error('❌ dist/index.html not found. Run `npm run build` first.');
    } else {
      throw error;
    }
  }
}

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldInject = args.includes('--inject');
  const useStatic = args.includes('--static');

  console.log('🔄 Generating pre-rendered login component...');

  // Use full Lit SSR rendering by default (renders full component tree with DSD)
  // Fall back to static shell if --static flag is passed
  let prerenderedHtml;
  if (useStatic) {
    console.log('📝 Using static HTML shell (--static flag)');
    prerenderedHtml = generateStaticLoginShell();
  } else {
    console.log('🔧 Using Lit SSR for full component tree rendering...');
    prerenderedHtml = await renderLoginComponent();
  }

  if (shouldInject) {
    await injectIntoDistHtml(prerenderedHtml);
  } else {
    // Output to stdout for inspection
    console.log('\n📄 Pre-rendered HTML:\n');
    console.log(prerenderedHtml);
    console.log('\n💡 Run with --inject to insert into dist/index.html');
  }
}

main().catch((error) => {
  console.error('❌ SSR Error:', error);
  process.exit(1);
});

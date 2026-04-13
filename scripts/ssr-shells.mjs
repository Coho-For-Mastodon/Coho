/**
 * SSR Script for pre-rendering app shells (login + home)
 *
 * This script pre-renders the app-login and app-home shell components and
 * injects them into dist/index.html. A small inline script conditionally
 * shows the correct shell based on auth state in localStorage.
 *
 * Usage: npx tsx scripts/ssr-shells.mjs [--inject]
 *   --inject: Inject the pre-rendered content into dist/index.html
 *
 * NOTE: This script must run AFTER `vite build` since it imports the compiled JS.
 */

import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { html } from 'lit';
import { readFile, writeFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Define Vite build-time constants for SSR context
globalThis.__APP_VERSION__ = Date.now();

// Minimal shims for module-level code that checks browser globals.
// Lit SSR already provides HTMLElement, customElements, etc.
// These cover non-Lit code (e.g. services that read localStorage at call time).
if (!globalThis.localStorage) {
  const noop = () => {};
  globalThis.localStorage = {
    getItem: () => null,
    setItem: noop,
    removeItem: noop,
    clear: noop,
    key: () => null,
    length: 0,
  };
}
if (!globalThis.sessionStorage) {
  const noop = () => {};
  globalThis.sessionStorage = {
    getItem: () => null,
    setItem: noop,
    removeItem: noop,
    clear: noop,
    key: () => null,
    length: 0,
  };
}
if (!globalThis.window) {
  globalThis.window = globalThis;
}
// location is needed by module-level code in config/firebase.ts
if (!globalThis.location) {
  globalThis.location = { hostname: '', protocol: 'https:', pathname: '/', search: '', hash: '', href: '' };
}

// ---------------------------------------------------------------------------
// Login shell
// ---------------------------------------------------------------------------

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

  return collectResult(result);
}

// ---------------------------------------------------------------------------
// Home shell
// ---------------------------------------------------------------------------

/**
 * Pre-render the app-home shell using actual Lit SSR.
 * Same approach as renderLoginComponent() — imports the real components
 * and renders them with DSD. With default state (no auth, no data),
 * the shell renders header, tab nav, empty panels, and sidebar skeletons.
 */
async function renderHomeShell() {
  // Import the home page and its shell dependencies.
  // home-sidebar is lazy-loaded in connectedCallback, so import it
  // explicitly to ensure it gets SSR'd with its skeleton state.
  await import('../src/pages/app-home.js');
  await import('../src/components/home-sidebar.js');

  const result = render(html`<app-home></app-home>`);
  return collectResult(result);
}

// ---------------------------------------------------------------------------
// Injection
// ---------------------------------------------------------------------------

/**
 * Inject both pre-rendered shells into dist/index.html.
 * A small inline script selects the correct shell based on auth state.
 */
async function injectIntoDistHtml(loginHtml, homeHtml) {
  const distIndexPath = join(rootDir, 'dist', 'index.html');

  try {
    let indexHtml = await readFile(distIndexPath, 'utf-8');

    const appIndexRegex = /<app-index><\/app-index>/;

    if (appIndexRegex.test(indexHtml)) {
      // Login shell is visible by default (/ route).
      // Home shell starts hidden; a simple path check swaps them on /home.
      indexHtml = indexHtml.replace(
        appIndexRegex,
        `<div id="ssr-shell-login">${loginHtml}</div>
<div id="ssr-shell-home" style="display:none">${homeHtml}</div>
<app-index></app-index>
<script>
// Show the correct shell based on route, just like the router would.
(function() {
  if (location.pathname.startsWith('/home')) {
    var loginEl = document.getElementById('ssr-shell-login');
    var homeEl  = document.getElementById('ssr-shell-home');
    if (loginEl) loginEl.style.display = 'none';
    if (homeEl) homeEl.style.display = '';

    var themeColor = localStorage.getItem('coho-theme-color');
    if (themeColor && homeEl) {
      homeEl.style.setProperty('--md-sys-color-primary', themeColor);
      homeEl.style.setProperty('--md-sys-color-secondary-container',
        'color-mix(in srgb, ' + themeColor + ' 15%, transparent)');
    }
  }

  // Remove both shells once app-index renders real content
  new MutationObserver(function(_, obs) {
    var appIndex = document.querySelector('app-index');
    if (appIndex && appIndex.children.length > 0) {
      var l = document.getElementById('ssr-shell-login');
      var h = document.getElementById('ssr-shell-home');
      if (l) l.remove();
      if (h) h.remove();
      obs.disconnect();
    }
  }).observe(document.querySelector('app-index'), { childList: true });
})();
</script>`
      );

      await writeFile(distIndexPath, indexHtml, 'utf-8');
      console.log('✅ Injected pre-rendered shells into dist/index.html');
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Main entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const shouldInject = args.includes('--inject');

  console.log('🔄 Generating pre-rendered shells...');

  // ---- Login shell ----
  console.log('🔧 Using Lit SSR for login component tree...');
  const loginHtml = await renderLoginComponent();

  // ---- Home shell ----
  console.log('🔧 Using Lit SSR for home component tree...');
  const homeHtml = await renderHomeShell();

  if (shouldInject) {
    await injectIntoDistHtml(loginHtml, homeHtml);
  } else {
    console.log('\n📄 Login shell:\n');
    console.log(loginHtml);
    console.log('\n📄 Home shell:\n');
    console.log(homeHtml);
    console.log('\n💡 Run with --inject to insert into dist/index.html');
  }
}

main().catch((error) => {
  console.error('❌ SSR Error:', error);
  process.exit(1);
});

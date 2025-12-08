/**
 * Build-time SSR script for Coho
 * Renders the login page component to static HTML for use as a loading skeleton
 *
 * Usage: npx tsx scripts/generate-ssr-skeleton.ts
 */

// Add missing browser globals BEFORE importing the DOM shim
const mockLocation = { pathname: '/', search: '', hash: '', href: 'http://localhost/' };
const mockHistory = { pushState: () => { }, replaceState: () => { }, back: () => { }, forward: () => { } };
const mockStorage = { getItem: () => null, setItem: () => { }, removeItem: () => { }, clear: () => { } };

// Mock the build time constant
Object.defineProperty(globalThis, '__APP_VERSION__', {
    value: new Date().toISOString(),
    writable: true,
    configurable: true
});

Object.defineProperty(globalThis, 'window', { value: globalThis, writable: true, configurable: true });
Object.defineProperty(globalThis, 'location', { value: mockLocation, writable: true, configurable: true });
Object.defineProperty(globalThis, 'history', { value: mockHistory, writable: true, configurable: true });
Object.defineProperty(globalThis, 'localStorage', { value: mockStorage, writable: true, configurable: true });
Object.defineProperty(globalThis, 'sessionStorage', { value: mockStorage, writable: true, configurable: true });
Object.defineProperty(globalThis, 'matchMedia', {
    value: () => ({ matches: false, addEventListener: () => { }, removeEventListener: () => { } }),
    writable: true,
    configurable: true
});
Object.defineProperty(globalThis, 'requestIdleCallback', {
    value: (cb: Function) => setTimeout(cb, 0),
    writable: true,
    configurable: true
});
// Add addEventListener/removeEventListener to window
Object.defineProperty(globalThis, 'addEventListener', {
    value: () => { },
    writable: true,
    configurable: true
});
Object.defineProperty(globalThis, 'removeEventListener', {
    value: () => { },
    writable: true,
    configurable: true
});

// Import the DOM shim after setting up globals
import '@lit-labs/ssr/lib/install-global-dom-shim.js';

import { html } from 'lit';
import { render } from '@lit-labs/ssr';
import { collectResult } from '@lit-labs/ssr/lib/render-result.js';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Import the real app-login component
// This works because we've made the router import dynamic in app-login.ts
import '../src/pages/app-login.js';

async function generateSkeleton() {
    console.log('🔨 Generating SSR skeleton for app-login...');

    try {
        // Render the login component
        const template = html`<app-login></app-login>`;
        const result = render(template);
        const skeletonHtml = await collectResult(result);

        console.log('✅ Generated skeleton HTML');

        // Read the current index.html from dist
        const indexPath = join(ROOT_DIR, 'dist', 'index.html');
        let indexHtml = readFileSync(indexPath, 'utf-8');

        // Replace the empty <app-index> with our skeleton wrapped in app-index
        // The real app-index will hydrate and take over
        indexHtml = indexHtml.replace(
            /<app-index><\/app-index>/,
            `<app-index>${skeletonHtml}</app-index>`
        );

        // Write the updated index.html
        writeFileSync(indexPath, indexHtml);
        console.log('✅ Injected skeleton into dist/index.html');

        // Also save the raw skeleton for reference
        const skeletonPath = join(ROOT_DIR, 'dist', 'login-skeleton.html');
        writeFileSync(skeletonPath, skeletonHtml);
        console.log(`✅ Saved raw skeleton to ${skeletonPath}`);

    } catch (error) {
        console.error('❌ SSR Skeleton Generation Error:', error);
        process.exit(1);
    }
}

generateSkeleton();

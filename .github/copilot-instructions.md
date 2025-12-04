# Coho - Mastodon PWA Development Guide

## Overview

Coho is a Progressive Web App Mastodon client built with **Lit 3.x web components**, **Vite**, and **Firebase Functions**. It emphasizes offline-first architecture, Material Design 3 components, and cross-platform PWA features.

## Quick Start

```bash
npm install && npm run dev    # Dev server on localhost:3000
npm run build                 # Production build with SSR skeleton generation
npm test                      # Playwright tests (requires build first)
firebase deploy --only hosting   # Deploy frontend
```

## Architecture Overview

### Directory Structure

- `src/pages/` - Route-level page components (lazy-loaded)
- `src/components/` - Reusable components; `md/` subdirectory contains MD3 components
- `src/services/` - Stateless API/data modules (no global state library)
- `src/utils/` - Router config, workers, helpers
- `functions/` - Firebase Functions (AI features, Mastodon proxies)

### Key Patterns

#### Component Structure

All components use Lit decorators. Use `@state()` for private reactive state, `@property()` for public props:

```typescript
@customElement('my-component')
export class MyComponent extends LitElement {
  @state() private loading = false;
  @property({ type: String }) userId = '';
  static styles = css`
    /* scoped styles */
  `;
  render() {
    return html`...`;
  }
}
```

#### Routing

Routes defined in `src/utils/router.ts` using `@thepassle/app-tools/router` with lazy loading:

```typescript
{ path: '/home', plugins: [lazy(() => import('../pages/app-home.js'))], render: () => html`<app-home></app-home>` }
```

Navigate with `router.navigate('/path')` or `<a href="/path">`.

#### Dual Token Storage (Critical)

Auth tokens **must** be stored in both localStorage AND IndexedDB for service worker access:

```typescript
// Frontend uses localStorage
const token = localStorage.getItem('accessToken');
// Service worker uses IndexedDB via idb-keyval
const token = await get('accessToken');
```

See `syncCredentialsToIndexedDB()` in `app-index.ts` for the sync pattern.

#### Service Layer Pattern

Services in `src/services/` are stateless. Always get fresh tokens:

```typescript
const getServer = () => localStorage.getItem('server') || '';
const getAccessToken = () => localStorage.getItem('accessToken') || '';

export async function getPostDetail(id: string): Promise<Post> {
  const response = await fetch(`https://${getServer()}/api/v1/statuses/${id}`, {
    headers: { Authorization: `Bearer ${getAccessToken()}` },
  });
  return response.json();
}
```

## Material Design 3 Components

**ALWAYS prefer MD3 components** (`src/components/md/`) over Shoelace or Fluent UI:

| Component | Tag         | Key Props                                        |
| --------- | ----------- | ------------------------------------------------ |
| Button    | `md-button` | `variant` (filled/outlined/text), `pill`, `size` |
| Dialog    | `md-dialog` | `label`, `open`, `fullscreen`                    |
| Tabs      | `md-tabs`   | `orientation`, `placement`, `active`             |
| Select    | `md-select` | `value`, `placeholder`, `variant`                |

### MD3 Styling Rules

1. **Use semantic tokens**: `--md-sys-color-primary`, `--md-sys-color-surface-container`
2. **Fallback to Shoelace**: `var(--md-sys-color-primary, var(--sl-color-primary-600))`
3. **Dark mode via media query**: `@media (prefers-color-scheme: dark)`
4. **Mobile breakpoint**: `@media(max-width: 820px)`
5. **No custom scrollbar styles** - use centralized styles in `md-tokens.css`

### Creating New MD3 Components

1. Create in `src/components/md/` following existing patterns
2. Support dark mode via media queries
3. Use slots for extensibility (`prefix`, `suffix`, `footer`)
4. Emit custom events for interactions
5. Add keyboard support (Enter/Space for buttons)

## Offline & PWA

### Service Worker (`src/sw.ts`)

- Workbox-based with `injectManifest` strategy
- NetworkFirst for navigation, CacheFirst for assets
- Background sync for failed requests via `BackgroundSyncPlugin`
- Push notifications with Mastodon-specific payload handling

### Settings

Stored in IndexedDB via `idb-keyval`, not localStorage:

```typescript
import { getSettings, setSettings } from './services/settings';
const settings = await getSettings();
await setSettings({ data_saver: true });
```

## Testing

```bash
npm run start-for-tests   # Build + serve on port 3000
npm test                  # Run Playwright tests
```

Tests use mock APIs registered in `tests/mocks/`. Auth seeding:

```typescript
await seedAuth(page); // Sets localStorage tokens and navigates to /home
```

## Firebase Functions

Located in `functions/src/index.ts`. Pattern:

```typescript
export const myFunction = onRequest(
  { secrets: [openaiApiKey] },
  async (req, res) => {
    if (req.method === 'OPTIONS') {
      applyCors(req, res);
      res.status(204).send('');
      return;
    }
    applyCors(req, res);
    // ... logic
    res.json(data);
  }
);
```

Requires `OPENAI_API_KEY` secret for AI features.

## Common Pitfalls

- **Array mutations don't trigger updates** - reassign: `this.items = [...this.items, newItem]`
- **Import components before use** - Lit components must be imported to be registered
- **Web Workers use top-level await** - modern browsers only
- **Service worker can't access localStorage** - use IndexedDB pattern above

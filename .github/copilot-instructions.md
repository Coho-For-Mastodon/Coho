# Coho - Mastodon PWA Development Guide

## Quick Start

```bash
npm install && npm run dev    # Dev server on localhost:3000
npm run build                 # Production build with SSR skeleton
npm run start-for-tests && npm test  # Playwright tests
```

## Architecture

**Stack**: Lit 3.x web components, Vite, Firebase Functions, Workbox service worker

```
src/
├── pages/           # Route-level components (lazy-loaded via router)
├── components/      # Reusable components
│   └── md/          # Custom MD3 components (25+ components)
├── services/        # Stateless API modules (no global state)
├── mastodon/        # Mastodon API client (types, api/, config/)
├── sw.ts            # Service worker (built separately by Vite)
└── utils/
    ├── router.ts         # Route definitions and router instance
    └── nav-router.ts     # Custom Navigation API router (with polyfills)
functions/src/       # Firebase Functions (AI features via OpenAI)
```

## Critical Pattern: Dual Token Storage

Auth tokens **must** exist in both localStorage (frontend) AND IndexedDB (service worker):

```typescript
// Frontend reads from localStorage
const token = localStorage.getItem('accessToken');

// Service worker reads from IndexedDB (idb-keyval)
const token = await get('accessToken');

// Sync happens in app-index.ts:syncCredentialsToIndexedDB()
```

## Component Patterns

Use Lit decorators. `@state()` for private reactive state, `@property()` for public props:

```typescript
@customElement('my-component')
export class MyComponent extends LitElement {
  @state() private loading = false;
  @property({ type: Object }) tweet: Post | undefined;

  static styles = css`
    /* scoped styles */
  `;
  render() {
    return html`...`;
  }
}
```

**Reactivity gotcha**: Array mutations don't trigger updates. Reassign: `this.items = [...this.items, newItem]`

## Services (src/services/)

Stateless modules that fetch fresh auth on each call:

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

**Settings**: Use IndexedDB via `src/services/settings.ts`, NOT localStorage.

## MD3 Components (`src/components/md/`)

**Always prefer custom MD3 components** over Shoelace/Fluent UI:

- `md-button` - variants: filled/outlined/text/elevated/tonal/fab
- `md-dialog`, `md-tabs`, `md-select`, `md-text-field`, `md-card`
- `md-skeleton`, `md-toast`, `md-menu`, `md-dropdown`

**Styling tokens**:

```css
background: var(--md-sys-color-surface-container, #1e1e24);
color: var(
  --md-sys-color-primary,
  var(--sl-color-primary-600)
); /* Shoelace fallback */
@media (max-width: 820px) {
  /* mobile breakpoint */
}
```

## Routing

Custom router built on the Navigation API (`src/utils/nav-router.ts`) with automatic polyfills for unsupported browsers.

**Key files:**

- `src/utils/router.ts` - Route definitions and router instance
- `src/utils/nav-router.ts` - Router class implementation
- `src/utils/router-polyfills.ts` - Conditional polyfill loader

Routes use lazy loading via plugins:

```typescript
{ path: '/home', plugins: [lazy(() => import('../pages/app-home.js'))], render: () => html`<app-home></app-home>` }
```

Navigate: `router.navigate('/path')` or use `<a href="/path">`

**Router features:**

- View Transitions API integration for smooth page animations
- URLPattern for route matching with parameters (e.g., `/post/:id`)
- Plugin system with `beforeNavigation`/`afterNavigation` hooks
- Automatic polyfills loaded only when needed (`@virtualstate/navigation`, `urlpattern-polyfill`)

**Initialization:** Router must be initialized before first render:

```typescript
await router.init(); // Loads polyfills if needed, sets up listeners
```

## Testing

Tests use Playwright with mock API routes:

```typescript
// tests/test-utils.ts
await bootstrapApp(page); // Registers mocks, loads app
await seedAuth(page); // Sets auth in localStorage, navigates to /home

// Mocks defined in tests/mocks/register-api.ts
// Mock data in tests/mocks/mock-data.ts
```

## Firebase Functions

Pattern in `functions/src/index.ts`:

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
  }
);
```

## Common Pitfalls

- **Import components before use** - Lit registers on import
- **Service worker built separately** - see `vite.config.ts` build-sw plugin
- **Auth redirect preservation** - `src/utils/auth-redirect.ts` stores intended destination in localStorage before OAuth flow

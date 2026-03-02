# Plan: Multi-Account Support

> Issue #375 — Multi-Account support

## TL;DR

Add infrastructure to store up to 5 Mastodon accounts keyed by `server:userId`, a centralized `AccountManager` that all existing token-reading code delegates to, and a header-avatar-based account switcher popover. The service worker only serves the active account (simplest path). Settings remain global. The main challenge is the ~15 files that read `accessToken`/`server` from localStorage — these converge through just 3 chokepoints (`getClientConfig()`, `getAccessToken()`/`getServer()` in api-client.ts, and the same pair in services/account.ts), making the refactor tractable.

### Design Decisions

- **Header avatar** replaces the settings gear as the account switcher entry point.
- **SW: active-account only** — push notifications and background sync only work for the active account.
- **Settings are global** (shared across accounts) — theme, font size, wellness mode, etc.
- **Cap at 5 accounts.**
- **localStorage stays as synchronous hot cache** for the active account — avoids making `getAccessToken()` async and changing ~15 call sites.
- **`window.location.reload()` on account switch** for v1 — simplest way to guarantee all components, in-memory caches, and the SW are in sync. Can be optimized to a soft-switch later.
- **No per-account push notifications in v1** — SW only knows the active account's token. Multi-account push is a follow-up.
- **Drafts and custom emojis already namespaced** — no changes needed.
- **Consolidate the two `getCurrentUser` implementations** (src/services/account.ts and src/mastodon/api/accounts.ts) to reduce cache-clearing surface area.

---

## Steps

### Step 1 — Define the stored account type and collection

Create a new module `src/services/account-manager.ts`. Define:

- `StoredAccount` interface: `{ server, accessToken, userId, username, displayName, avatar, acct }` — enough to render the switcher without a network call.
- `AccountStore` interface: `{ accounts: Record<string, StoredAccount>; activeAccountKey: string | null }` where keys are `"server:userId"`.
- Store the collection in IndexedDB under key `"accountStore"` (via `idb-keyval`).
- **Keep writing `accessToken`/`server` to localStorage** as a hot cache for synchronous reads — the active account's values mirror there.
- Export: `getActiveAccount()`, `setActiveAccount(key)`, `addAccount(storedAccount)`, `removeAccount(key)`, `getAllAccounts()`, `getAccountCount()`.
- Cap at 5 accounts; `addAccount()` rejects when full.

### Step 2 — Refactor the 3 token-reading chokepoints

These 3 locations are where all ~15 consuming files funnel through:

1. **`src/mastodon/config/client.ts`** — `getClientConfig()`: continues reading from localStorage (which now always holds the active account's values). **No change needed** in consuming code.
2. **`src/utils/api-client.ts` (lines 77-78)** — `getAccessToken()` / `getServer()`: same — reads from localStorage. **No change needed.**
3. **`src/services/account.ts` (lines 11-12)** — `getAccessToken()` / `getServer()`: same pattern. **No change needed.**

**Key insight:** localStorage remains the synchronous hot path for the active account. The `AccountManager` is the source of truth for the _collection_, and whenever the active account changes, it writes the new values into localStorage and IndexedDB. This means zero changes to the ~12 consuming service files.

### Step 3 — Update the OAuth flow to support "Add Account"

Modify `src/services/account.ts` `authToClient()` (~line 516):

- After receiving the access token and fetching `getCurrentUser()`, construct a `StoredAccount` from the response.
- Call `AccountManager.addAccount(storedAccount)` and `AccountManager.setActiveAccount(key)`.
- Keep the existing localStorage/IndexedDB writes (they now serve as the active-account hot cache).
- Add a localStorage flag `"addingAccount"` before initiating OAuth so the callback knows whether to replace or add. Clear it after completion.

Modify `src/pages/app-login.ts` login flow:

- When `addingAccount` flag is set, after OAuth completes, navigate back to `/home` instead of the default post-login flow (since the user is already authenticated on another account).

### Step 4 — Build the Account Switcher UI

**4a — Header avatar button** — Modify `src/components/header.ts`:

- Add a `user` property of type `Account | null` (passed from the parent page).
- When authenticated, replace the settings gear `<md-icon-button>` with a circular avatar `<img>` button styled to match the header icon size (~28px).
- On click, open an `<md-menu>` / `<md-dropdown>` directly within the header (or dispatch `"open-account-switcher"`).

**4b — Account switcher popover** — Create `src/components/account-switcher.ts`:

- New Lit component using `<md-menu>` or `<md-dropdown>` from the existing MD3 library.
- Lists all stored accounts (avatar, display name, `@user@server`) with a checkmark on the active one.
- "Add Account" button at the bottom (disabled when count = 5).
- "Settings" link (replaces the old settings gear entry point).
- Each account row: tap to switch, long-press or swipe to reveal "Remove" action.
- Fires `"switch-account"` and `"add-account"` custom events.

**4c — Wire into app-home** — Modify `src/pages/app-home.ts`:

- Listen for `switch-account` → call `AccountManager.setActiveAccount(key)` → trigger account switch flow (Step 5).
- Listen for `add-account` → set `addingAccount` flag → navigate to `/` (login page) with a query param like `?addAccount=true`.
- Pass `user` to `<app-header>`.

### Step 5 — Account switching logic

Create a `switchAccount(key: string)` function in `AccountManager`:

1. Look up `StoredAccount` by key.
2. Write new `accessToken`, `server`, `currentUserID` to localStorage.
3. Write new `accessToken`, `server` to IndexedDB (for the SW).
4. **Clear in-memory caches**: both `currentUser` module-level variables in `src/services/account.ts` and `src/mastodon/api/accounts.ts`. Export a `clearCurrentUserCache()` from each, or consolidate to one `getCurrentUser` implementation.
5. **Clear volatile caches**: `sessionStorage` items (`timeline_cache_*`, `coho:sidebar_*`, `preload_*`), in-memory emoji cache in `src/services/custom-emojis.ts`.
6. **Trigger a full app refresh** — `window.location.reload()`. Simplest reliable approach for v1. A softer approach (dispatching a global event and having each page re-init) could follow later.

### Step 6 — Update `handleUnauthorized()` for multi-account

Modify `src/utils/api-client.ts` `handleUnauthorized()` (~line 83):

- Instead of clearing all auth, remove only the **active** account from the `AccountStore`.
- If other accounts remain, auto-switch to the next one (and reload).
- If no accounts remain, redirect to login as today.

### Step 7 — Add explicit Logout UI

Currently there is no logout button anywhere. Add one:

- In the account switcher popover, add a "Log out" option per account (or at minimum for the active account).
- In the settings drawer content (`src/components/settings-drawer-content.ts`), add a "Log out" button.
- Logout calls `AccountManager.removeAccount(key)`, then either switches to another account or redirects to login.

### Step 8 — Sync active account to the Service Worker

Modify `src/app-index.ts` `syncCredentialsToIndexedDB()` (~line 234):

- This already writes `accessToken` and `server` to IndexedDB. It continues to do so for the active account.
- After a switch, the new values are written before `reload()`, so the SW picks them up naturally.
- The SW's `getAuthHeaders()` in `src/sw/helpers.ts` (~line 42) needs **no changes** — it always reads the current single `accessToken`/`server` from IndexedDB.

### Step 9 — Handle cache namespacing

- **SW API response caches**: Currently not explicitly cached per-account. Since switching does a full reload and API responses use the active account's token, responses will be fresh. No immediate change needed, but add a TODO for future per-account cache partitioning.
- **IndexedDB `currentUser`**: Already overwritten on each `getCurrentUser()` call. After switching, the reload triggers a fresh fetch, overwriting the cache. OK for v1.
- **IndexedDB `timeline-cache`**: Clear on account switch (add to the `switchAccount` function).
- **IndexedDB `background-sync-queue`**: Leave as-is — queued items carry their original auth headers and will replay correctly.

### Step 10 — Migration for existing users

On first load after upgrade, detect the old single-account state (presence of `accessToken` in localStorage, absence of `accountStore` in IndexedDB):

- Fetch `getCurrentUser()` to populate avatar/username.
- Create an initial `AccountStore` with one entry.
- Set it as the active account.
- This runs once in `app-index.ts` `firstUpdated()` before the app renders.

### Step 11 — Update the settings drawer

Modify `src/components/settings-drawer-content.ts`:

- The profile section at the top already shows the current user. Keep it showing the active account.
- Add a "Log out" button below or near the profile section.
- Settings access remains — reachable from both the header popover and the drawer.

---

## Files Changed (Summary)

| File                                        | Change                                                                                    |
| ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `src/services/account-manager.ts`           | **New** — core account collection management                                              |
| `src/components/account-switcher.ts`        | **New** — switcher popover component                                                      |
| `src/services/account.ts`                   | Modify `authToClient()` to register with AccountManager; export `clearCurrentUserCache()` |
| `src/mastodon/api/accounts.ts`              | Export `clearCurrentUserCache()` (or consolidate with above)                              |
| `src/pages/app-login.ts`                    | Handle `addAccount` flow                                                                  |
| `src/components/header.ts`                  | Replace settings gear with avatar; host account switcher                                  |
| `src/pages/app-home.ts`                     | Wire `switch-account` / `add-account` events; pass `user` to header                       |
| `src/utils/api-client.ts`                   | Update `handleUnauthorized()` for multi-account                                           |
| `src/app-index.ts`                          | Add migration logic in `firstUpdated()`                                                   |
| `src/components/settings-drawer-content.ts` | Add logout button                                                                         |
| `src/services/custom-emojis.ts`             | Export cache-clearing function for account switch                                         |

**Files NOT changed** (by design): all `src/mastodon/api/` modules, `src/mastodon/config/client.ts`, most `src/services/` modules, `src/sw/helpers.ts`, `src/sw/*`.

---

## Verification

- **Unit tests**: Add Vitest tests for `AccountManager` — add/remove/switch/cap-at-5/migration logic. Test file: `tests/services/account-manager.test.ts`.
- **Component tests**: Test `account-switcher.ts` renders the correct number of accounts, emits correct events.
- **E2E tests**: Add Playwright tests for:
  - Login with one account → verify avatar appears in header
  - Add a second account → verify both appear in switcher
  - Switch between accounts → verify timeline changes
  - Remove an account → verify it's gone from switcher
  - Hit the 5-account cap → verify "Add Account" is disabled
- **Manual checks**: Verify SW push notifications still work for active account. Verify offline fallback still loads the correct cached user. Verify drafts survive account switches (already namespaced).
- Run `npm run lint` and `npm run test:run` after changes.

---

## Key References

| Concept                            | File                                        | Lines    |
| ---------------------------------- | ------------------------------------------- | -------- |
| Token sync to IndexedDB            | `src/app-index.ts`                          | ~234-244 |
| OAuth init                         | `src/services/account.ts`                   | ~501-514 |
| OAuth token exchange               | `src/services/account.ts`                   | ~516-569 |
| `getClientConfig()` chokepoint     | `src/mastodon/config/client.ts`             | ~7-12    |
| `apiFetch()` auth injection        | `src/utils/api-client.ts`                   | ~225-231 |
| `handleUnauthorized()`             | `src/utils/api-client.ts`                   | ~83-99   |
| SW auth headers                    | `src/sw/helpers.ts`                         | ~42-55   |
| Settings (IndexedDB)               | `src/services/settings.ts`                  | —        |
| Auth state helpers                 | `src/services/auth-state.ts`                | —        |
| Header component                   | `src/components/header.ts`                  | —        |
| Settings drawer                    | `src/components/settings-drawer-content.ts` | —        |
| Drafts (already namespaced)        | `src/services/drafts.ts`                    | —        |
| Custom emojis (already namespaced) | `src/services/custom-emojis.ts`             | —        |

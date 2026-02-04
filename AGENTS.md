# AGENTS.md instructions for /Users/justinwillis/Projects/Coho

<INSTRUCTIONS>
## Project Summary
Coho is a fast, offline-first PWA Mastodon client built with Lit, Vite, TypeScript, and a custom service worker. The product goals are performance, simplicity, and resilient offline behavior. UI should remain responsive even on bad networks, and dynamic UI should never "pop in" without a subtle animation.

## Key Principles
- Offline-first: user actions should not block on the network; use optimistic UI and background sync where possible.
- Performance-first: keep the main thread light, use lazy loading, and defer non-critical work.
- Design consistency: prefer the in-repo MD3 components and shared styles instead of third-party UI libraries.

## Quickstart
- Dev server: `npm run dev` (Vite on port 3000)
- Build: `npm run build`
- Lint: `npm run lint`
- Format: `npm run format`
- Unit tests: `npm test` or `npm run test:run` (Vitest)
- E2E tests: `npm run test:e2e` (Playwright)
- Bundle size tests: `npm run test:bundle-size`
- Localization extract/build: `npm run localize:extract`, `npm run localize:build`

## Repo Map
- `src/components/`: reusable UI components
- `src/components/md/`: custom Material Design 3 components (preferred)
- `src/pages/`: route-level views
- `src/services/`: stateless business logic and API access
- `src/mastodon/`: typed Mastodon API client
- `src/router/`: custom nav-router and route definitions
- `src/styles/`: shared styles and MD3 tokens
- `src/sw.ts`: service worker source of truth
- `functions/`: Firebase Functions backend
- `docs/`: deeper technical guides

## Component Patterns (Lit)
- Use `@customElement`, `@property` for public inputs, and `@state` for internal state.
- Shadow DOM is the default; styles should be encapsulated.
- Remember to reassign arrays/objects to trigger updates.
- Use `connectedCallback` and `disconnectedCallback` for setup/cleanup.
- Prefer shared styles from `src/styles/` and MD3 components from `src/components/md/`.

## Routing and Lazy Loading
- Routes live in `src/router/routes.ts` and should use `lazy(() => import('../pages/...'))` for code splitting.
- Pass navigation data via `AppNavigationState` rather than globals when possible.
- Heavy components and overlays should be lazy-loaded using `src/utils/lazy-component-loader.ts` and `LazyOverlayManager` from `src/utils/lazy-overlay.ts`.
- Defer non-critical work with `requestIdleCallback`.

## Offline and Service Worker
- The service worker source is `src/sw.ts` and is built via custom Vite plugins.
- Mutations are queued for background sync; UI should update optimistically.
- The SW cannot access `localStorage`; tokens must be synced to IndexedDB.
- Caching strategy is documented in `docs/SERVICE_WORKER.md`.

## Localization
- Use `@lit/localize` and wrap user-facing strings with `msg()`.
- Add `@localized()` to components that render localized strings.
- Update translations by running `npm run localize:extract` and `npm run localize:build`.
- Translation files live in `xliff/` and generated locales in `src/generated/`.

## Styling and Theming
- Prefer MD3 components and tokens in `src/styles/md-tokens.css`.
- Use CSS variables for theme colors; see `src/utils/theme-color.ts`.
- Use `content-visibility` and `contain` where appropriate to reduce rendering cost.

## Testing and Quality
- Unit tests are in Vitest; E2E tests in Playwright.
- Use `npm run lint` and `npm run format` before submitting.
- Conventional commits are preferred (see `CONTRIBUTING.md`).

## Tests (How to Run)
- Unit tests (watch): `npm test`
- Unit tests (one-shot): `npm run test:run`
- Coverage: `npm run coverage`
- E2E (headless): `npm run test:e2e`
- E2E (headed): `npm run test:e2e:headed`
- E2E (UI): `npm run test:e2e:ui`
- Bundle size checks: `npm run test:bundle-size`
- Test files live in `tests/` and in feature folders like `src/router/tests/`.

## Additional References
- `docs/TECHNICAL_ARCHITECTURE.md` for architecture overview
- `docs/COMPONENT_GUIDE.md` for component best practices
- `docs/LOCALIZATION.md` for i18n workflow
- `docs/SERVICE_WORKER.md` for offline architecture
- `docs/WHY_COHO.md` for product goals

## Skills
A skill is a set of local instructions to follow that is stored in a `SKILL.md` file. Below is the list of skills that can be used. Each entry includes a name, description, and file path so you can open the source for full instructions when using a specific skill.
### Available skills
- playwright: Use when the task requires automating a real browser from the terminal (navigation, form filling, snapshots, screenshots, data extraction, UI-flow debugging) via `playwright-cli` or the bundled wrapper script. (file: /Users/justinwillis/.codex/skills/playwright/SKILL.md)
- skill-creator: Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Codex's capabilities with specialized knowledge, workflows, or tool integrations. (file: /Users/justinwillis/.codex/skills/.system/skill-creator/SKILL.md)
- skill-installer: Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). (file: /Users/justinwillis/.codex/skills/.system/skill-installer/SKILL.md)
### How to use skills
- Discovery: The list above is the skills available in this session (name + description + file path). Skill bodies live on disk at the listed paths.
- Trigger rules: If the user names a skill (with `$SkillName` or plain text) OR the task clearly matches a skill's description shown above, you must use that skill for that turn. Multiple mentions mean use them all. Do not carry skills across turns unless re-mentioned.
- Missing/blocked: If a named skill isn't in the list or the path can't be read, say so briefly and continue with the best fallback.
- How to use a skill (progressive disclosure):
  1) After deciding to use a skill, open its `SKILL.md`. Read only enough to follow the workflow.
  2) When `SKILL.md` references relative paths (e.g., `scripts/foo.py`), resolve them relative to the skill directory listed above first, and only consider other paths if needed.
  3) If `SKILL.md` points to extra folders such as `references/`, load only the specific files needed for the request; don't bulk-load everything.
  4) If `scripts/` exist, prefer running or patching them instead of retyping large code blocks.
  5) If `assets/` or templates exist, reuse them instead of recreating from scratch.
- Coordination and sequencing:
  - If multiple skills apply, choose the minimal set that covers the request and state the order you'll use them.
  - Announce which skill(s) you're using and why (one short line). If you skip an obvious skill, say why.
- Context hygiene:
  - Keep context small: summarize long sections instead of pasting them; only load extra files when needed.
  - Avoid deep reference-chasing: prefer opening only files directly linked from `SKILL.md` unless you're blocked.
  - When variants exist (frameworks, providers, domains), pick only the relevant reference file(s) and note that choice.
- Safety and fallback: If a skill can't be applied cleanly (missing files, unclear instructions), state the issue, pick the next-best approach, and continue.
</INSTRUCTIONS>

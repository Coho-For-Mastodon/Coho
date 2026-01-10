# Localization Guide

Coho uses [lit-localize](https://lit.dev/docs/localization/overview/) in **runtime mode** for internationalization. This allows locale switching without page reloads and lazy-loads translation files on demand.

## Quick Reference

### Adding a new translatable string

```typescript
import { msg } from '@lit/localize';

// Simple string
html`<span>${msg('Hello World')}</span>`;

// String with interpolation (use str tag)
import { msg, str } from '@lit/localize';
html`<span>${msg(str`${count} followers`)}</span>`;
```

### Making a component re-render on locale change

Add the `@localized()` decorator before `@customElement()`:

```typescript
import { msg, localized } from '@lit/localize';

@localized()
@customElement('my-component')
export class MyComponent extends LitElement {
  render() {
    return html`<p>${msg('Translatable text')}</p>`;
  }
}
```

## Architecture

```
src/
├── config/localization.ts      # Configuration and locale switching
├── generated/
│   ├── locale-codes.ts         # Auto-generated locale constants
│   └── locales/
│       └── es.ts               # Spanish translations (auto-generated structure)
xliff/
└── es.xlf                      # XLIFF file for translators
lit-localize.json               # lit-localize configuration
tsconfig.localize.json          # TypeScript config for lit-localize tools
```

## How It Works

1. **Source strings** are wrapped with `msg()` in the source code
2. **Extract** command scans code and generates XLIFF files for translation
3. **Build** command generates locale modules from translated XLIFF
4. **Runtime** lazy-loads locale modules when `setLocale()` is called
5. **Components** with `@localized()` automatically re-render when locale changes

## Commands

```bash
# Extract strings from source code to XLIFF files
npm run localize:extract

# Build locale modules from translated XLIFF files
npm run localize:build
```

## Workflow: Adding & Updating Translations

Follow this process to add new strings or update existing translations:

1.  **Add Strings in Code**: Wrap user-facing text with `msg()` in your components.
2.  **Extract**: Run `npm run localize:extract`. This updates `xliff/*.xlf` files with new strings.
3.  **Translate**: Open the `.xlf` files and add translations for the new `<trans-unit>` elements.
    - _Tip: Use an XLIFF editor or a text editor to modify the `<target>` tags._
4.  **Build**: Run `npm run localize:build`. This generates the TypeScript files in `src/generated/locales/`.
5.  **Verify**: Start the app and switch locales to verify the new translations.
6.  **Commit**: Commit the changes to source code, XLIFF files, and generated locale files.

## Adding Strings to a Component

### Step 1: Import msg (and str if needed)

```typescript
// For simple strings
import { msg } from '@lit/localize';

// For strings with interpolation
import { msg, str } from '@lit/localize';
```

### Step 2: Add @localized() decorator

```typescript
import { msg, localized } from '@lit/localize';

@localized()
@customElement('my-component')
export class MyComponent extends LitElement {
```

### Step 3: Wrap strings with msg()

```typescript
// Before
html`<button>Save</button>`;

// After
html`<button>${msg('Save')}</button>`;

// With interpolation
html`<span>${msg(str`${count} items`)}</span>`;

// With HTML (use html tag inside msg)
html`${msg(html`Click <b>here</b> to continue`)}`;
```

### Step 4: Extract and translate

```bash
npx lit-localize extract
# Edit xliff/es.xlf with translations
npx lit-localize build
```

## Adding a New Language

### Step 1: Update lit-localize.json

```json
{
  "targetLocales": ["es", "fr"] // Add new locale code
}
```

### Step 2: Add the locale import

Edit `src/config/localization.ts`:

```typescript
const localeModules: Record<string, () => Promise<any>> = {
  es: () => import('../generated/locales/es.js'),
  fr: () => import('../generated/locales/fr.js'), // Add new import
};
```

### Step 3: Extract and build

```bash
npx lit-localize extract  # Creates xliff/fr.xlf
# Translate the XLIFF file
npx lit-localize build    # Generates src/generated/locales/fr.ts
```

## Testing Localization

### In browser console

```javascript
// Switch to Spanish
await cohoLocale.setLocale('es');

// Switch back to English
await cohoLocale.setLocale('en');

// Check current locale
cohoLocale.getLocale();

// See available locales
cohoLocale.availableLocales;
```

### Via URL parameter

```
http://localhost:3000/?locale=es
```

### Clear saved preference

```javascript
localStorage.removeItem('locale');
```

## File Details

### lit-localize.json

Main configuration file:

```json
{
  "$schema": "https://raw.githubusercontent.com/lit/lit/main/packages/localize-tools/config.schema.json",
  "sourceLocale": "en",
  "targetLocales": ["es"],
  "tsConfig": "tsconfig.localize.json",
  "output": {
    "mode": "runtime",
    "outputDir": "src/generated/locales",
    "localeCodesModule": "src/generated/locale-codes.ts"
  },
  "interchange": {
    "format": "xliff",
    "xliffDir": "xliff"
  }
}
```

### src/config/localization.ts

Configures runtime locale switching:

- `getLocale()` - Returns current locale code
- `setLocale(locale)` - Switches locale (returns Promise)
- `getPreferredLocale()` - Gets saved/detected locale preference
- `saveLocalePreference(locale)` - Persists to localStorage

### Generated files (don't edit manually)

- `src/generated/locale-codes.ts` - Exports `sourceLocale`, `targetLocales`, `allLocales`
- `src/generated/locales/es.ts` - Spanish translations module

### XLIFF files (for translators)

- `xliff/es.xlf` - Spanish translations in XLIFF format

## Best Practices

1. **Always use `@localized()` decorator** on components with `msg()` calls
2. **Use `str` tag** for strings with `${interpolation}`
3. **Keep strings simple** - avoid complex HTML in translatable strings
4. **Provide context** - use the `desc` option for ambiguous strings:
   ```typescript
   msg('Save', { desc: 'Button to save changes' });
   ```
5. **Run extract after adding strings** - keeps XLIFF files in sync
6. **Don't edit generated files** - they're overwritten by `lit-localize build`

## Troubleshooting

### Strings not updating after locale change

- Ensure component has `@localized()` decorator
- Check that `msg()` is imported from `@lit/localize`

### Extract fails with "es2024 not supported"

- We use a separate `tsconfig.localize.json` with `es2022` lib
- This is referenced in `lit-localize.json`

### Dynamic import errors in Vite

- Use explicit imports in `localeModules` object instead of template literals
- Each locale needs its own import statement

### XLIFF changes not reflected

- Run `npx lit-localize build` after editing XLIFF files
- The build generates new TypeScript modules from XLIFF

## Testing

### Setting locale in Playwright tests

Tests set the locale to English before the app loads to ensure consistent assertions:

```typescript
// In tests/test-utils.ts
await page.addInitScript(() => {
  localStorage.setItem('locale', 'en');
});
```

This ensures tests looking for English strings like "followed you" will pass regardless of the test machine's browser language setting.

### Testing locale switching

To test that locale switching works:

```typescript
test('can switch locale', async ({ page }) => {
  await bootstrapApp(page);

  // Switch to Spanish via console
  await page.evaluate(async () => {
    await window.cohoLocale.setLocale('es');
  });

  // Assert Spanish text appears
  await expect(page.locator('...')).toContainText('Spanish text');
});
```

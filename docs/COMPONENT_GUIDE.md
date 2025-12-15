# Component Development Guide

## Overview

Coho uses **Lit** for its component architecture. We prioritize standard Web Components over framework-specific abstractions. This guide outlines the patterns and standards for creating UI components in the application.

## Lit Component Pattern

Components should follow a standard structure using TypeScript decorators.

```typescript
import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

@customElement('my-feature')
export class MyFeature extends LitElement {
  // Public API - passed in from parent
  @property({ type: String }) title = '';

  // Internal Reactive State
  @state() private _isLoading = false;

  // Scoped Styles
  static styles = css`
    :host {
      display: block;
    }
  `;

  render() {
    return html`
      <div class="container">
        <h1>${this.title}</h1>
      </div>
    `;
  }
}
```

### Key Principles

1.  **Reactivity**: Use `@property` for public inputs and `@state` for private internal state. Remember that mutating arrays/objects does not trigger updates; you must reassign them (e.g., `this.items = [...this.items, newItem]`).
2.  **Shadow DOM**: We use Shadow DOM for style encapsulation. Global styles generally do not leak in, and component styles do not leak out.
3.  **Lifecycle**: Use `connectedCallback()` for setup (like adding event listeners) and `disconnectedCallback()` for cleanup.

## Material Design 3 (MD3)

We have implemented a custom set of Material Design 3 components located in `src/components/md/`. **Always prefer these over third-party libraries** to maintain design consistency and keep bundle size low.

### Available Components

- **Layout**: `md-card`, `md-divider`, `md-tabs`, `md-toolbar`
- **Input**: `md-text-field`, `md-text-area`, `md-checkbox`, `md-switch`, `md-select`
- **Actions**: `md-button`, `md-icon-button`, `md-fab`
- **Feedback**: `md-dialog`, `md-toast`, `md-skeleton`

### Usage Example

```html
<md-card>
  <div slot="headline">Settings</div>
  <div slot="content">
    <md-text-field label="Username" value="${this.username}"></md-text-field>

    <md-button variant="filled" @click="${this.save}"> Save </md-button>
  </div>
</md-card>
```

### Theming & Tokens

We use CSS variables for theming, allowing for runtime theme switching (e.g., primary color changes).

Common tokens:

- `--md-sys-color-primary`: Main brand color.
- `--md-sys-color-surface`: Background color for cards/sheets.
- `--md-sys-color-on-primary`: Text color on top of primary color.

## Best Practices

- **Lazy Loading**: If a component is heavy or only used in specific routes, consider lazy loading it via dynamic imports in the parent component or router.
- **Event Communication**: Use standard DOM events to communicate up.
  ```typescript
  this.dispatchEvent(
    new CustomEvent('save-success', {
      bubbles: true,
      composed: true,
      detail: { id: 123 },
    })
  );
  ```
- **Optimistic UI**: For actions like "Favorite" or "Boost", update the UI state immediately before the API call completes to ensure the app feels snappy. Revert if the call fails.

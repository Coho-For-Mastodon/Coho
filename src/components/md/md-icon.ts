import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { ifDefined } from 'lit/directives/if-defined.js';
import { unsafeSVG } from 'lit/directives/unsafe-svg.js';

/**
 * Lazy-loaded icon library reference
 * Only loaded when a named icon is first requested
 */
let iconLibraryPromise: Promise<Record<string, string>> | null = null;

async function getIconFromLibrary(name: string): Promise<string | undefined> {
  if (!iconLibraryPromise) {
    iconLibraryPromise = import('./md-icon-library').then(
      (m) => m.ICON_LIBRARY
    );
  }
  const library = await iconLibraryPromise;
  return library[name];
}

/**
 * Get available icon names (for error messages)
 */
async function getAvailableIconNames(): Promise<string[]> {
  if (!iconLibraryPromise) {
    iconLibraryPromise = import('./md-icon-library').then(
      (m) => m.ICON_LIBRARY
    );
  }
  const library = await iconLibraryPromise;
  return Object.keys(library);
}

/**
 * In-flight + completed fetch cache keyed by URL.
 * Storing the Promise (not the result) means concurrent mounts for the same
 * src share one fetch instead of each firing their own.
 */
const SVG_CACHE = new Map<string, Promise<string>>();

/**
 * Material Design 3 Icon Component
 *
 * Displays icons from three sources (in priority order):
 * 1. Named icons from built-in library (no network request)
 * 2. External SVG files via `src` attribute (cached in memory)
 * 3. Inline SVG content via default slot
 *
 * @slot - Default slot for inline SVG content (alternative to src/name)
 *
 * @fires md-icon-load - Dispatched when the icon has loaded
 * @fires md-icon-error - Dispatched when the icon fails to load
 *
 * @csspart base - The icon's base container
 * @csspart svg - The SVG element
 *
 * @example
 * ```html
 * <!-- Named icon (fastest, no network) -->
 * <md-icon name="home"></md-icon>
 *
 * <!-- External SVG (cached after first load) -->
 * <md-icon src="/assets/custom-icon.svg"></md-icon>
 *
 * <!-- Inline SVG -->
 * <md-icon><svg>...</svg></md-icon>
 * ```
 */
@customElement('md-icon')
export class MdIcon extends LitElement {
  /** The name of a built-in icon from the icon library */
  @property({ type: String }) name?: string;

  /** The path/URL to the SVG icon file (used if name is not provided) */
  @property({ type: String }) src?: string;

  /** The label for accessibility */
  @property({ type: String }) label?: string;

  /** Size of the icon (CSS length value) */
  @property({ type: String }) size = '24px';

  @state() private svgContent = '';
  @state() private loadError = false;

  /** Track the currently loaded src to avoid redundant loads */
  private _loadedSrc?: string;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
    }

    .icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      position: relative;
      width: var(--md-icon-size, 24px);
      height: var(--md-icon-size, 24px);
      color: inherit;
      fill: currentColor;
      vertical-align: middle;
      transition:
        opacity 0.15s ease-in-out,
        transform 0.15s ease-in-out;
    }

    .icon svg {
      width: 100%;
      height: 100%;
      display: block;
    }

    /* Ensure SVG inherits text color */
    .icon ::slotted(svg),
    .icon svg {
      color: inherit;
    }

    /* Error state */
    .icon--error {
      opacity: 0.38;
    }
  `;

  async updated(changedProperties: Map<string, unknown>) {
    // Priority: name > src
    if (changedProperties.has('name') || changedProperties.has('src')) {
      if (this.name) {
        await this.loadNamedIcon();
      } else if (this.src) {
        await this.loadExternalIcon();
      }
    }
    if (changedProperties.has('size')) {
      this.style.setProperty('--md-icon-size', this.size);
    }
  }

  async connectedCallback() {
    super.connectedCallback();
    if (this.name) {
      await this.loadNamedIcon();
    } else if (this.src) {
      await this.loadExternalIcon();
    }
    this.style.setProperty('--md-icon-size', this.size);
  }

  /**
   * Load icon from built-in library (lazy-loaded)
   */
  private async loadNamedIcon() {
    const iconSvg = await getIconFromLibrary(this.name!);

    if (iconSvg) {
      this.svgContent = iconSvg;
      this.loadError = false;

      this.dispatchEvent(
        new CustomEvent('md-icon-load', {
          bubbles: true,
          composed: true,
          detail: { name: this.name },
        })
      );
    } else {
      const availableIcons = await getAvailableIconNames();
      console.warn(
        `Icon "${this.name}" not found in icon library. Available icons:`,
        availableIcons.join(', ')
      );
      this.loadError = true;
      this.svgContent = '';

      this.dispatchEvent(
        new CustomEvent('md-icon-error', {
          bubbles: true,
          composed: true,
          detail: {
            name: this.name,
            error: new Error(`Icon "${this.name}" not found`),
          },
        })
      );
    }
  }

  /**
   * Load icon from external source with in-memory caching.
   *
   * SVG_CACHE stores the Promise itself so concurrent mounts for the same URL
   * share one fetch. If slotted content is already present (SSR inline SVG),
   * we skip the fetch entirely — the icon is already rendered correctly.
   */
  private async loadExternalIcon() {
    if (!this.src) return;

    // Skip if we already loaded this exact src
    if (this._loadedSrc === this.src && this.svgContent) {
      return;
    }

    // If inline SVG children are already present (e.g. SSR-inlined via unsafeSVG),
    // skip the fetch — the icon is already rendered correctly in the slot.
    if (this.childNodes.length > 0) {
      return;
    }

    const src = this.src;

    // Reuse an in-flight or completed fetch for the same URL
    let promise = SVG_CACHE.get(src);
    if (!promise) {
      promise = fetch(src)
        .then((r) => {
          if (!r.ok) throw new Error(`Failed to load icon: ${r.status}`);
          return r.text();
        })
        .catch((error) => {
          // Evict on failure so a later retry can try again
          SVG_CACHE.delete(src);
          throw error;
        });
      SVG_CACHE.set(src, promise);
    }

    try {
      const text = await promise;
      this.svgContent = text;
      this.loadError = false;
      this._loadedSrc = src;
      this.dispatchEvent(
        new CustomEvent('md-icon-load', {
          bubbles: true,
          composed: true,
          detail: { src, cached: true },
        })
      );
    } catch (error) {
      console.error('Error loading icon:', error);
      this.loadError = true;
      this.svgContent = '';
      this.dispatchEvent(
        new CustomEvent('md-icon-error', {
          bubbles: true,
          composed: true,
          detail: { src, error },
        })
      );
    }
  }

  render() {
    const classes = {
      'icon': true,
      'icon--error': this.loadError,
    };

    const hasLabel = !!this.label;

    return html`
      <div
        part="base"
        class="${Object.entries(classes)
          .filter(([_, v]) => v)
          .map(([k]) => k)
          .join(' ')}"
        role="${hasLabel ? 'img' : 'presentation'}"
        aria-hidden="${hasLabel ? 'false' : 'true'}"
        aria-label="${ifDefined(hasLabel ? this.label : undefined)}"
      >
        ${
          this.svgContent
            ? html`<div part="svg">${unsafeSVG(this.svgContent)}</div>`
            : html`<slot></slot>`
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-icon': MdIcon;
  }
}

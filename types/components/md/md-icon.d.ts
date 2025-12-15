import { LitElement } from 'lit';
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
export declare class MdIcon extends LitElement {
  /** The name of a built-in icon from the icon library */
  name?: string;
  /** The path/URL to the SVG icon file (used if name is not provided) */
  src?: string;
  /** The label for accessibility */
  label?: string;
  /** Size of the icon (CSS length value) */
  size: string;
  private svgContent;
  private loadError;
  static styles: import('lit').CSSResult;
  updated(changedProperties: Map<string, unknown>): Promise<void>;
  connectedCallback(): Promise<void>;
  /**
   * Load icon from built-in library (lazy-loaded)
   */
  private loadNamedIcon;
  /**
   * Load icon from external source with in-memory caching
   */
  private loadExternalIcon;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'md-icon': MdIcon;
  }
}

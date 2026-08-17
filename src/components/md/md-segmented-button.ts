import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * MD3 Segmented Button Container
 *
 * A segmented button group for switching between views/filters.
 * Unlike md-tabs, this always stays at the top regardless of screen size.
 *
 * @fires segment-change - Emitted when active segment changes { detail: { value: string } }
 *
 * @slot default - Slot for md-segment elements
 *
 * @example
 * ```html
 * <md-segmented-button value="all">
 *   <md-segment value="all">All</md-segment>
 *   <md-segment value="mentions">Mentions</md-segment>
 *   <md-segment value="follows">Follows</md-segment>
 * </md-segmented-button>
 * ```
 */
@customElement('md-segmented-button')
export class MdSegmentedButton extends LitElement {
  /**
   * Currently selected segment value
   */
  @property({ type: String, reflect: true }) value: string = '';

  /** Accessible label for the radio group */
  @property({ type: String, attribute: 'aria-label' }) ariaGroupLabel: string =
    '';

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .container {
      display: flex;
      background: transparent;
      border: 1px solid var(--md-sys-color-outline, #79747e);
      border-radius: var(--md-sys-shape-corner-full, 9999px);
      padding: 0;
      gap: 0;
      overflow-x: auto;
      overflow-y: hidden;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .container::-webkit-scrollbar {
      display: none;
    }

    ::slotted(md-segment) {
      flex: 1;
      min-width: fit-content;
      border-right: 1px solid var(--md-sys-color-outline, #79747e);
    }

    ::slotted(md-segment:last-child) {
      border-right: none;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .container {
        border-color: var(--md-sys-color-outline, #938f99);
      }
      ::slotted(md-segment) {
        border-right-color: var(--md-sys-color-outline, #938f99);
      }
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.addEventListener(
      'segment-selected',
      this._handleSegmentSelected as EventListener
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener(
      'segment-selected',
      this._handleSegmentSelected as EventListener
    );
  }

  firstUpdated() {
    this._updateSegments();
  }

  updated(changedProperties: Map<string, unknown>) {
    if (changedProperties.has('value')) {
      this._updateSegments();
    }
  }

  private _handleSegmentSelected(e: CustomEvent) {
    e.stopPropagation();
    const value = e.detail.value;
    if (value && value !== this.value) {
      this.value = value;
      this._updateSegments();

      this.dispatchEvent(
        new CustomEvent('segment-change', {
          detail: { value },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  private _updateSegments() {
    const slot = this.shadowRoot?.querySelector('slot');
    if (!slot) return;

    const segments = slot
      .assignedElements()
      .filter(
        (el) => el.tagName.toLowerCase() === 'md-segment'
      ) as HTMLElement[];

    // Auto-select first segment if no value set
    if (!this.value && segments.length > 0) {
      this.value = (segments[0] as MdSegment).value || '';
    }

    segments.forEach((segment) => {
      const seg = segment as MdSegment;
      if (seg.value === this.value) {
        segment.setAttribute('selected', '');
      } else {
        segment.removeAttribute('selected');
      }
    });
  }

  render() {
    return html`
      <div
        class="container"
        role="radiogroup"
        aria-label="${this.ariaGroupLabel}"
      >
        <slot @slotchange=${this._updateSegments}></slot>
      </div>
    `;
  }
}

/**
 * MD3 Segment
 *
 * Individual segment button within md-segmented-button.
 *
 * @fires segment-selected - Emitted when segment is clicked { detail: { value: string } }
 *
 * @slot default - Segment label content
 * @slot icon - Optional icon
 */
@customElement('md-segment')
export class MdSegment extends LitElement {
  /**
   * Value identifier for this segment
   */
  @property({ type: String, reflect: true }) value: string = '';

  /**
   * Whether this segment is selected
   */
  @property({ type: Boolean, reflect: true }) selected: boolean = false;

  /**
   * Whether this segment is disabled
   */
  @property({ type: Boolean, reflect: true }) disabled: boolean = false;

  static styles = css`
    :host {
      display: inline-flex;
    }

    button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 20px;
      border: none;
      background: transparent;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      font-family: inherit;
      font-size: var(--md-sys-typescale-label-large-font-size, 14px);
      font-weight: 500;
      cursor: pointer;
      border-radius: 0;
      transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
      white-space: nowrap;
      width: 100%;
      min-height: 40px;
      outline: none;
      -webkit-tap-highlight-color: transparent;
    }

    button:focus {
      outline: none;
    }

    button:focus-visible {
      outline: 2px solid
        var(--md-sys-color-primary, var(--sl-color-primary-600, #6750a4));
      outline-offset: -2px;
    }

    button:active:not(:disabled) {
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #1d1b20) 12%,
        transparent
      );
    }

    :host([selected]) button {
      background: var(
        --md-sys-color-secondary-container,
        var(--sl-color-primary-100, #e8def8)
      );
      color: var(
        --md-sys-color-on-secondary-container,
        var(--sl-color-primary-900, #1d192b)
      );
      font-weight: 600;
    }

    :host([disabled]) button {
      opacity: 0.38;
      cursor: not-allowed;
    }

    ::slotted([slot='icon']) {
      width: 18px;
      height: 18px;
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      button {
        color: var(--md-sys-color-on-surface-variant, #cac4d0);
      }

      :host([selected]) button {
        background: var(--md-sys-color-secondary-container, #4a4458);
        color: var(--md-sys-color-on-secondary-container, #e8def8);
      }
    }
  `;

  private _handleClick() {
    if (this.disabled) return;
    import('../../utils/haptics')
      .then((m) => m.hapticSegmentTick())
      .catch(() => {});

    this.dispatchEvent(
      new CustomEvent('segment-selected', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <button
        role="radio"
        aria-checked="${this.selected}"
        ?disabled="${this.disabled}"
        @click="${this._handleClick}"
      >
        <slot name="icon"></slot>
        <slot></slot>
      </button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'md-segmented-button': MdSegmentedButton;
    'md-segment': MdSegment;
  }
}

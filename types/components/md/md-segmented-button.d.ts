import { LitElement } from 'lit';
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
export declare class MdSegmentedButton extends LitElement {
    /**
     * Currently selected segment value
     */
    value: string;
    static styles: import("lit").CSSResult;
    connectedCallback(): void;
    disconnectedCallback(): void;
    firstUpdated(): void;
    updated(changedProperties: Map<string, unknown>): void;
    private _handleSegmentSelected;
    private _updateSegments;
    render(): import("lit-html").TemplateResult<1>;
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
export declare class MdSegment extends LitElement {
    /**
     * Value identifier for this segment
     */
    value: string;
    /**
     * Whether this segment is selected
     */
    selected: boolean;
    /**
     * Whether this segment is disabled
     */
    disabled: boolean;
    static styles: import("lit").CSSResult;
    private _handleClick;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'md-segmented-button': MdSegmentedButton;
        'md-segment': MdSegment;
    }
}

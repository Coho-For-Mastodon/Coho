import { LitElement } from 'lit';
import './md-icon';
/**
 * Material Design 3 Icon Button Component
 *
 * An icon button is a clickable icon that triggers an action.
 * Supports standard, filled, filled-tonal, and outlined variants.
 *
 * Variants:
 * - `standard` - Transparent background (default)
 * - `filled` - Bold primary color background
 * - `filled-tonal` - Subtle secondary container background
 * - `outlined` - Transparent with border
 *
 * @slot - Default slot for custom icon content
 *
 * @fires click - Standard click event
 *
 * @csspart base - The button's base container
 * @csspart icon - The icon container
 */
export declare class MdIconButton extends LitElement {
    /** The name of a built-in icon from the icon library */
    name?: string;
    /** The path/URL to the SVG icon file (used if name is not provided) */
    src?: string;
    /** The label for accessibility */
    label?: string;
    /** Button variant */
    variant: 'standard' | 'filled' | 'filled-tonal' | 'outlined';
    /** Whether the button is disabled */
    disabled: boolean;
    /** Tooltip text shown on hover */
    title: string;
    static styles: import("lit").CSSResult;
    private handleClick;
    private handleKeyDown;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        'md-icon-button': MdIconButton;
    }
}

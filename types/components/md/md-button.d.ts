import { LitElement } from 'lit';
/**
 * Material Design 3 Button Component
 * Supports filled, outlined, text, elevated, tonal, and fab variants
 */
export declare class MdButton extends LitElement {
    variant: 'filled' | 'outlined' | 'text' | 'elevated' | 'tonal' | 'fab';
    size: 'small' | 'medium' | 'large';
    disabled: boolean;
    pill: boolean;
    type: 'button' | 'submit' | 'reset';
    title: string;
    static styles: import("lit").CSSResult;
    private handleClick;
    render(): import("lit-html").TemplateResult<1>;
}

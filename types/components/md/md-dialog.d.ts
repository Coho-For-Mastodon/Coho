import { LitElement } from 'lit';
/**
 * Material Design 3 Dialog Component
 * A dialog using native HTML <dialog> element with Material Design 3 styling
 */
export declare class MdDialog extends LitElement {
    label: string;
    open: boolean;
    fullscreen: boolean;
    noBackdropClose: boolean;
    dialog: HTMLDialogElement;
    static styles: import("lit").CSSResult;
    render(): import("lit-html").TemplateResult<1>;
    updated(changedProperties: Map<PropertyKey, unknown>): void;
    show(): void;
    hide(): Promise<void>;
    private _handleCancel;
    private _handleBackdropClick;
    private _handleClose;
    private _hasFooterSlot;
}
declare global {
    interface HTMLElementTagNameMap {
        'md-dialog': MdDialog;
    }
}

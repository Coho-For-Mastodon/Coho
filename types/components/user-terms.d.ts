import { LitElement } from 'lit';
import './md/md-checkbox.js';
export declare class UserTerms extends LitElement {
    private _interests;
    static styles: import("lit").CSSResult[];
    firstUpdated(): Promise<void>;
    handleChecked(e: CustomEvent<{
        checked: boolean;
    }>): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

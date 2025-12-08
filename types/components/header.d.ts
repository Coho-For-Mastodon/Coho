import { LitElement, PropertyValueMap } from 'lit';
import './md/md-icon.js';
import './md/md-icon-button.js';
export declare class AppHeader extends LitElement {
    title: string;
    enableBack: boolean;
    static get styles(): import("lit").CSSResult;
    constructor();
    protected firstUpdated(_changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>): void;
    openSettings(): void;
    handleTheming(): void;
    openBotDrawer(): void;
    goBack(): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

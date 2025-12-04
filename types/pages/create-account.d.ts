import { LitElement, PropertyValueMap } from 'lit';
import '../components/md/md-dialog.js';
import '../components/md/md-button.js';
import '../components/md/md-badge.js';
export declare class CreateAccount extends LitElement {
    servers: any[];
    chosenServer: string | undefined;
    fullDesc: string | undefined;
    registered: boolean;
    filledValues: any[];
    static styles: import("lit").CSSResult[];
    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): Promise<void>;
    startRegister(serverInfo: any): void;
    doRegister(): Promise<void>;
    registerInputChange(id: string): void;
    render(): import("lit-html").TemplateResult<1>;
}

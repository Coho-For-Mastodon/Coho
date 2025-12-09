import { LitElement, PropertyValueMap } from 'lit';
import '../components/md/md-dialog.js';
import '../components/md/md-button.js';
import '../components/md/md-badge.js';
interface ServerInfo {
    name: string;
    thumbnail?: string;
    users?: number;
    info: {
        full_description?: string;
        short_description?: string;
        usage?: {
            users?: {
                total: number;
            };
        };
        categories?: string[];
    };
}
export declare class CreateAccount extends LitElement {
    servers: ServerInfo[];
    chosenServer: string | undefined;
    fullDesc: string | undefined;
    registered: boolean;
    filledValues: string[];
    static styles: import("lit").CSSResult[];
    protected firstUpdated(_changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>): Promise<void>;
    startRegister(serverInfo: ServerInfo): void;
    doRegister(): Promise<void>;
    registerInputChange(id: string): void;
    render(): import("lit-html").TemplateResult<1>;
}
export {};

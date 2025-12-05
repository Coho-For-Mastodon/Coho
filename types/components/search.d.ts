import { LitElement } from 'lit';
import './md/md-text-field';
interface SearchData {
    query?: string;
    accounts?: Array<{
        id: string;
        avatar: string;
        display_name: string;
        acct: string;
    }>;
    statuses?: unknown[];
    hashtags?: unknown[];
}
export declare class Search extends LitElement {
    searchData: SearchData | undefined;
    static styles: import("lit").CSSResult[];
    connectedCallback(): Promise<void>;
    handleSearch(value: string): Promise<void>;
    openAccount(id: string): void;
    render(): import("lit-html").TemplateResult<1>;
}
export {};

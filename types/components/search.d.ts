import { LitElement } from 'lit';
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
    private _inputValue;
    /** Optional avatar URL to display on the right side of the search bar */
    avatar: string;
    private _input;
    static styles: import("lit").CSSResult[];
    connectedCallback(): Promise<void>;
    private _handleContainerClick;
    private _handleKeyDown;
    private _handleInput;
    handleSearch(value: string): Promise<void>;
    openAccount(id: string): void;
    render(): import("lit-html").TemplateResult<1>;
}
export {};

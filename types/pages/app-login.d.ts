import { LitElement } from 'lit';
import '../components/md/md-autocomplete';
import '../components/md/md-button';
import '../components/md/md-card';
import type { AutocompleteOption } from '../components/md/md-autocomplete';
export declare class AppLogin extends LitElement {
    loadIntro: boolean;
    instances: AutocompleteOption[];
    chosenServer: string;
    loadingInstances: boolean;
    private _searchDebounceTimer;
    static styles: import("lit").CSSResult[];
    firstUpdated(): Promise<void>;
    login(): Promise<void>;
    openIntro(): Promise<void>;
    scrollToItem(scroller: Element, width: number): void;
    next(): void;
    getStarted(): Promise<void>;
    handleServerInput(event: Event | CustomEvent<{
        value: string;
    }>): void;
    searchInstances(query: string): Promise<void>;
    handleServerSelect(event: CustomEvent): void;
    joinMastodon(): Promise<void>;
    explore(): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

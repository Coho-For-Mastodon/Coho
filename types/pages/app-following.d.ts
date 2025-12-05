import { LitElement } from 'lit';
import '../components/user-profile';
import type { Account } from '../mastodon/types';
export declare class Appfollowing extends LitElement {
    following: Account[];
    static styles: import("lit").CSSResult[];
    firstUpdated(): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

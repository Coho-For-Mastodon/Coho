import { LitElement } from 'lit';
import { Post } from '../interfaces/Post';
import './md/md-skeleton-card';
export declare class Favorites extends LitElement {
    favorites: Post[];
    isLoading: boolean;
    static styles: import("lit").CSSResult[];
    firstUpdated(): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

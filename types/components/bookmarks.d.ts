import { LitElement } from 'lit';
import { Post } from '../interfaces/Post';
import './timeline-item';
import './md/md-skeleton-card';
export declare class Bookmarks extends LitElement {
    bookmarks: Post[];
    isLoading: boolean;
    static styles: import("lit").CSSResult[];
    connectedCallback(): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

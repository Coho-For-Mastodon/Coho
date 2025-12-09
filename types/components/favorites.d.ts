import { LitElement } from 'lit';
import { Post } from '../interfaces/Post';
import './timeline-item';
import './md/md-skeleton-card';
import './md/md-divider';
export declare class Favorites extends LitElement {
    favorites: Post[];
    isLoading: boolean;
    static styles: import("lit").CSSResult[];
    firstUpdated(): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

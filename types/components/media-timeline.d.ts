import { LitElement } from 'lit';
import './md/md-skeleton';
import '@lit-labs/virtualizer';
import '../components/timeline-item';
import '../components/search';
import { Post } from '../interfaces/Post';
export declare class MediaTimeline extends LitElement {
    timeline: Post[];
    loadingData: boolean;
    timelineType: 'Home' | 'Public' | 'Media';
    static styles: import("lit").CSSResult[];
    connectedCallback(): Promise<void>;
    /** Handle visibility changes from lit-virtualizer to trigger load more */
    private _handleVisibilityChanged;
    refreshTimeline(): Promise<void>;
    loadMore(): Promise<void>;
    handleReplies(data: Array<Post>): void;
    render(): import("lit-html").TemplateResult<1>;
}

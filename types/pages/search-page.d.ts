import { LitElement } from 'lit';
import '../components/search';
import '../components/media-timeline';
import '../components/md/md-skeleton';
import '../components/md/md-segmented-button';
import type { Account } from '../mastodon/types';
import type { TrendingTag, TrendingLink } from '../mastodon/types/instance';
import type { Post } from '../interfaces/Post';
interface SearchData {
    query?: string;
    accounts?: Account[];
    statuses?: Post[];
    hashtags?: TrendingTag[];
}
export declare class SearchPage extends LitElement {
    searchData: SearchData | undefined;
    trending: Post[] | undefined;
    trendingLinks: TrendingLink[] | undefined;
    activeSegment: string;
    static styles: import("lit").CSSResult[];
    handleSearch(search: {
        searchData: SearchData;
    }): Promise<void>;
    openAccount(id: string): void;
    handleHashtagClick(hashtag: string): void;
    /**
     * Strip HTML tags from a string (for bio/note display)
     */
    private stripHtml;
    /**
     * Format large numbers with K/M suffixes
     */
    private formatNumber;
    render(): import("lit-html").TemplateResult<1>;
}
export {};

import { LitElement, type PropertyValues } from 'lit';
import '../components/header';
import '../components/timeline-item';
import '../components/md/md-icon';
import '../components/md/md-icon-button';
import '../components/md/md-text-area';
import '../components/md/md-skeleton-card';
import { Post } from '../interfaces/Post';
export declare class PostDetail extends LitElement {
  tweet: Post | null;
  replies: Post[];
  replyingTo: Post | null;
  loading: boolean;
  error: string | null;
  passed_tweet: Post | null;
  private replyTextArea;
  static styles: import('lit').CSSResult[];
  connectedCallback(): Promise<void>;
  protected updated(changedProperties: PropertyValues): void;
  firstUpdated(): Promise<void>;
  private loadReplies;
  shareStatus(): Promise<void>;
  handleReply(): Promise<void>;
  handleReplyClick(e: CustomEvent): void;
  private handleOpenPost;
  render(): import('lit-html').TemplateResult<1>;
}

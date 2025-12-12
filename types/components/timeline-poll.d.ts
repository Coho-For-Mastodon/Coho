import { LitElement } from 'lit';
import type { Post } from '../interfaces/Post';
import '../components/md/md-checkbox';
import '../components/md/md-button';
export declare class TimelinePoll extends LitElement {
  post: Post | undefined;
  private selected;
  private submitting;
  private error;
  private forceShowResults;
  protected updated(changed: Map<string, unknown>): void;
  static styles: import('lit').CSSResult;
  private _poll;
  private _hasVoted;
  private _isExpired;
  /**
   * Returns true if the current authenticated user is the author of this poll.
   * Mastodon doesn't allow voting on your own polls, so we show results instead.
   */
  private _isOwnPoll;
  private _shouldShowResults;
  private _onCheckboxChange;
  private _submitVote;
  private _renderMeta;
  private _renderOptions;
  private _renderFooterHint;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'timeline-poll': TimelinePoll;
  }
}

import { LitElement } from 'lit';
import type { Post } from '../interfaces/Post';
import '../components/md/md-checkbox';
import '../components/md/md-button';
export declare class TimelinePoll extends LitElement {
  post: Post | undefined;
  private selected;
  private submitting;
  private error;
  static styles: import('lit').CSSResult;
  private _poll;
  private _hasVoted;
  private _isExpired;
  private _shouldShowResults;
  private _onCheckboxChange;
  private _submitVote;
  private _renderMeta;
  private _renderOptions;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'timeline-poll': TimelinePoll;
  }
}

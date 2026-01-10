import { LitElement } from 'lit';
import { Post } from '../interfaces/Post';
import './md/md-icon';
import './md/md-icon-button';
import '../pages/post-detail';
/**
 * Fullscreen dialog for displaying post details.
 * Integrates with browser history so the back button closes the dialog.
 */
export declare class PostDetailDialog extends LitElement {
  post: Post | null;
  private isOpen;
  private dialog;
  private _boundPopStateHandler;
  static styles: import('lit').CSSResult;
  connectedCallback(): void;
  disconnectedCallback(): void;
  /**
   * Open the dialog with a post.
   * Pushes a history state so the back button will close the dialog.
   */
  open(post: Post): void;
  /**
   * Close the dialog.
   * If triggered by back button, does not manipulate history.
   * Otherwise, goes back in history to remove the dialog state.
   */
  close(fromPopState?: boolean): Promise<void>;
  private _handlePopState;
  private _handleCancel;
  private _handleBackdropClick;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'post-detail-dialog': PostDetailDialog;
  }
}

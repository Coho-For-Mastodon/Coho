import { LitElement } from 'lit';
import './md/md-tab';
import './md/md-icon';
import './md/md-button';
export declare class HomeTabsNav extends LitElement {
  isGuestMode: boolean;
  hasNewNotifications: boolean;
  connectedCallback(): void;
  createRenderRoot(): this;
  private _handleReload;
  private _handleOpenNewPost;
  render(): import('lit-html').TemplateResult<1>;
}

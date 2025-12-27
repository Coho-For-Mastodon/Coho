import { LitElement } from 'lit';
import './md/md-skeleton';
import './md/md-badge';
import './md/md-switch';
import './md/md-icon';
import './md/md-icon-button';
import './md/md-dropdown';
import './md/md-menu';
import './md/md-menu-item';
import type { Account } from '../mastodon/types/account';
import type { Instance } from '../mastodon/types/instance';
/**
 * Settings drawer content component.
 * Displays user profile info, settings toggles, keyboard shortcuts, and instance info.
 */
export declare class SettingsDrawerContent extends LitElement {
  user: Account | null;
  instanceInfo: Instance | null;
  wellnessMode: boolean;
  dataSaverMode: boolean;
  userTermsLoaded: boolean;
  static styles: import('lit').CSSResult;
  private goToFollowers;
  private goToFollowing;
  private viewMyProfile;
  private shareMyProfile;
  private editMyProfile;
  private handleWellnessToggle;
  private handleDataSaverToggle;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'settings-drawer-content': SettingsDrawerContent;
  }
}

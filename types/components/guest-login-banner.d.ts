import { LitElement } from 'lit';
import './md/md-button';
/**
 * A subtle banner prompting guest users to sign in.
 * Displays at the bottom of the screen with a login call-to-action.
 */
export declare class GuestLoginBanner extends LitElement {
  static styles: import('lit').CSSResult;
  private handleSignIn;
  render(): import('lit-html').TemplateResult<1>;
}

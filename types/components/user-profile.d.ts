import { LitElement } from 'lit';
import { Account } from '../mastodon/types';
export declare class UserProfile extends LitElement {
  account: Account | undefined;
  small: boolean;
  boosted: boolean;
  static styles: import('lit').CSSResult[];
  firstUpdated(): Promise<void>;
  loadImage(): void;
  openUser(): Promise<void>;
  render(): import('lit-html').TemplateResult<1>;
}

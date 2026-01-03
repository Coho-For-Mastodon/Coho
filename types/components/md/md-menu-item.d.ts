import { LitElement } from 'lit';
/**
 * Material Design 3 Menu Item Component
 * A menu item represents an option within a menu
 */
export declare class MdMenuItem extends LitElement {
  disabled: boolean;
  selected: boolean;
  title: string;
  static styles: import('lit').CSSResult;
  render(): import('lit-html').TemplateResult<1>;
  private _handleClick;
  private _handleKeydown;
}
declare global {
  interface HTMLElementTagNameMap {
    'md-menu-item': MdMenuItem;
  }
}

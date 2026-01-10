import { LitElement } from 'lit';
/**
 * Material Design 3 Menu Divider Component
 * A divider separates groups of menu items, optionally with a label
 */
export declare class MdMenuDivider extends LitElement {
  label: string;
  static styles: import('lit').CSSResult;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'md-menu-divider': MdMenuDivider;
  }
}

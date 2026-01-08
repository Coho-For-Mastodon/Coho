import { LitElement } from 'lit';
import './md/md-dialog';
import './md/md-button';
export declare class ShortcutsHelpDialog extends LitElement {
  open: boolean;
  static styles: import('lit').CSSResult;
  connectedCallback(): void;
  disconnectedCallback(): void;
  private _handleShowShortcutsHelp;
  show(): void;
  hide(): void;
  private _renderShortcut;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'shortcuts-help-dialog': ShortcutsHelpDialog;
  }
}

import { LitElement } from 'lit';
import './md/md-toast.js';
export declare class PwaUpdate extends LitElement {
  private updateAvailable;
  private updateCallback;
  connectedCallback(): void;
  disconnectedCallback(): void;
  private handleUpdate;
  private doUpdate;
  render(): import('lit-html').TemplateResult<1> | null;
}

import { LitElement } from 'lit';
/**
 * Material Design 3 Skeleton Component
 *
 * Minimal loading placeholder for content that's being loaded.
 * Supports different shapes (rectangle, circle) and sizes.
 */
export declare class MdSkeleton extends LitElement {
  shape: 'rectangle' | 'circle';
  width: string;
  height: string;
  static styles: import('lit').CSSResult;
  private _applyInlineSize;
  connectedCallback(): void;
  protected updated(changed: Map<string, unknown>): void;
  render(): import('lit-html').TemplateResult<1>;
}

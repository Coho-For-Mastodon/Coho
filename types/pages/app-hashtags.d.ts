import { LitElement, PropertyValueMap } from 'lit';
import type { Post } from '../interfaces/Post';
import '../components/post-detail-dialog';
export declare class AppHashtags extends LitElement {
  data: Post[] | undefined;
  tag: string | null | undefined;
  private postDetailDialog;
  static styles: import('lit').CSSResult[];
  protected firstUpdated(
    _changedProperties: PropertyValueMap<unknown> | Map<PropertyKey, unknown>
  ): Promise<void>;
  private handleOpenPost;
  render(): import('lit-html').TemplateResult<1>;
}

import { LitElement, PropertyValueMap } from 'lit';
import type { Post } from '../interfaces/Post';
export declare class AppHashtags extends LitElement {
    data: Post[] | undefined;
    tag: string | null | undefined;
    static styles: import("lit").CSSResult[];
    protected firstUpdated(_changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

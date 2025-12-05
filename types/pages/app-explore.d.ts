import { LitElement } from 'lit';
import '../components/preview-timeline';
import '../components/md/md-text-field';
import type { Post } from '../interfaces/Post';
export declare class AppExplore extends LitElement {
    timeline: Post[];
    static styles: import("lit").CSSResult[];
    firstUpdated(): Promise<void>;
    login(): Promise<void>;
    signup(): void;
    render(): import("lit-html").TemplateResult<1>;
}

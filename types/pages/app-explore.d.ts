import { LitElement } from 'lit';
import '../components/preview-timeline';
import '../components/md/md-text-field';
export declare class AppExplore extends LitElement {
    timeline: any[];
    static styles: import("lit").CSSResult[];
    firstUpdated(): Promise<void>;
    login(): Promise<void>;
    signup(): void;
    render(): import("lit-html").TemplateResult<1>;
}

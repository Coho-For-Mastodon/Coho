import { LitElement } from 'lit';
import type { MediaAttachment } from '../types/interfaces/MediaAttachment';
export declare class ImageCarousel extends LitElement {
    images: MediaAttachment[];
    blurhashUrls: Map<string, string>;
    constructor();
    static styles: import("lit").CSSResult[];
    firstUpdated(): void;
    updated(changedProperties: Map<string, unknown>): void;
    disconnectedCallback(): void;
    private generateBlurhashes;
    private getImageStyle;
    private handleImageLoad;
    openInBox(image: MediaAttachment): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

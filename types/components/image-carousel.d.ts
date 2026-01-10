import { LitElement } from 'lit';
import type { MediaAttachment } from '../types/interfaces/MediaAttachment';
export declare class ImageCarousel extends LitElement {
  images: MediaAttachment[];
  blurhashUrls: Map<string, string>;
  currentIndex: number;
  static styles: import('lit').CSSResult[];
  firstUpdated(): void;
  updated(changedProperties: Map<string, unknown>): void;
  disconnectedCallback(): void;
  private _handleKeydown;
  private _navigatePrevious;
  private _navigateNext;
  private _scrollToCurrentImage;
  private generateBlurhashes;
  private getImageStyle;
  private handleImageLoad;
  openInBox(image: MediaAttachment): Promise<void>;
  render(): import('lit-html').TemplateResult<1>;
}

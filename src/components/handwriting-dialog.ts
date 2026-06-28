import { LitElement, html, css } from 'lit';
import { customElement, state, query, property } from 'lit/decorators.js';
import { localized, msg } from '@lit/localize';
import { spinAnimation } from '../styles/animations';

import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-icon.js';
import './md/md-icon-button.js';

import type { MdDialog } from './md/md-dialog.js';
import {
  recognizeHandwriting,
  getHandwritingRecognitionMethod,
} from '../services/ai';

// Tesseract types for lazy loading
type TesseractWorker = {
  recognize: (
    image: string
  ) => Promise<{ data: { text: string; confidence: number } }>;
  terminate: () => Promise<void>;
};

/**
 * Handwriting input dialog component
 * Provides a canvas for users to write text by hand, which is then
 * recognized using Chrome's on-device Prompt API
 */
@localized()
@customElement('handwriting-dialog')
export class HandwritingDialog extends LitElement {
  @property({ type: Boolean }) open = false;

  @state() private isRecognizing = false;
  @state() private hasContent = false;
  @state() private isMobile = false;
  @state() private recognitionMethod: 'prompt-api' | 'tesseract' | false =
    false;

  @query('#handwriting-dialog') private dialog!: MdDialog;
  @query('#handwriting-canvas') private canvas!: HTMLCanvasElement;

  private ctx: CanvasRenderingContext2D | null = null;
  private isPainting = false;
  private currentColor = '#1a1a24';
  private brushSize = 4;

  // Lazy-loaded Tesseract worker
  private tesseractWorker: TesseractWorker | null = null;

  static styles = [
    spinAnimation,
    css`
      :host {
        display: block;
      }

      md-dialog::part(dialog) {
        min-width: 80vw;
        min-height: 60vh;
      }

      .canvas-container {
        position: relative;
        border-radius: var(--md-sys-shape-corner-medium);
        overflow: hidden;
        background: #fff;
        aspect-ratio: 16/9;
        min-height: 300px;
      }

      #handwriting-canvas {
        display: block;
        width: 100%;
        height: 100%;
        cursor: crosshair;
        touch-action: none;
      }

      .canvas-hint {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: #ccc;
        font-size: 1.25rem;
        pointer-events: none;
        transition: opacity 0.3s;
      }

      .canvas-hint.hidden {
        opacity: 0;
      }

      .dialog-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        gap: 12px;
      }

      .dialog-actions .left-actions {
        display: flex;
        gap: 8px;
      }

      .dialog-actions .right-actions {
        display: flex;
        gap: 8px;
      }

      .recognizing-spinner {
        display: inline-block;
        width: 18px;
        height: 18px;
        border: 2px solid transparent;
        border-top-color: currentColor;
        border-radius: var(--md-sys-shape-corner-circle);
        animation: spin 0.8s linear infinite;
      }

      md-button.recognizing {
        --md-button-container-color: #e879f9;
        animation: ai-glow 1.5s ease-in-out infinite;
      }

      @keyframes ai-glow {
        0%,
        100% {
          box-shadow: 0 0 2px 1px rgba(232, 121, 249, 0.5);
        }
        50% {
          box-shadow:
            0 0 6px 2px rgba(232, 121, 249, 0.7),
            0 0 12px 4px rgba(217, 70, 239, 0.4);
        }
      }

      @media (max-width: 820px) {
        md-dialog::part(dialog) {
          min-width: 100vw;
          min-height: 100vh;
        }

        .canvas-container {
          aspect-ratio: auto;
          height: calc(100vh - 200px);
          min-height: 200px;
        }
      }
    `,
  ];

  connectedCallback() {
    super.connectedCallback();
    this.isMobile = window.matchMedia('(max-width: 820px)').matches;
    window
      .matchMedia('(max-width: 820px)')
      .addEventListener('change', this.handleMediaChange);

    // Check which recognition method is available
    this.checkRecognitionMethod();
  }

  private async checkRecognitionMethod() {
    this.recognitionMethod = await getHandwritingRecognitionMethod();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window
      .matchMedia('(max-width: 820px)')
      .removeEventListener('change', this.handleMediaChange);

    // Clean up Tesseract worker if loaded
    if (this.tesseractWorker) {
      this.tesseractWorker.terminate();
      this.tesseractWorker = null;
    }
  }

  private handleMediaChange = (e: MediaQueryListEvent) => {
    this.isMobile = e.matches;
  };

  updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has('open')) {
      if (this.open) {
        this.showDialog();
      }
    }
  }

  private async showDialog() {
    await this.updateComplete;
    await customElements.whenDefined('md-dialog');

    this.dialog?.show();

    // Initialize canvas after dialog is shown
    await this.updateComplete;
    requestAnimationFrame(() => {
      this.initCanvas();
    });
  }

  private initCanvas() {
    if (!this.canvas) return;

    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Set canvas size with device pixel ratio for crisp lines
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    // Get context and scale for device pixel ratio
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;

    this.ctx.scale(dpr, dpr);

    // Set canvas CSS size
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';

    // Fill white background
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Configure drawing
    this.ctx.lineWidth = this.brushSize;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.currentColor;

    // Reset state
    this.hasContent = false;
    this.isPainting = false;
  }

  private getPosition(e: MouseEvent | TouchEvent) {
    const rect = this.canvas.getBoundingClientRect();
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    const mouseEvent = e as MouseEvent;
    return {
      x: mouseEvent.clientX - rect.left,
      y: mouseEvent.clientY - rect.top,
    };
  }

  private startPaint = (e: MouseEvent | TouchEvent) => {
    this.isPainting = true;
    const pos = this.getPosition(e);
    if (this.ctx) {
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x, pos.y);
    }

    if (!this.hasContent) {
      this.hasContent = true;
    }
  };

  private paint = (e: MouseEvent | TouchEvent) => {
    if (!this.isPainting || !this.ctx) return;
    e.preventDefault();

    const pos = this.getPosition(e);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  };

  private stopPaint = () => {
    if (this.isPainting && this.ctx) {
      this.isPainting = false;
      this.ctx.beginPath();
    }
  };

  private clearCanvas() {
    if (!this.ctx || !this.canvas) return;

    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasContent = false;
  }

  /**
   * Lazy load Tesseract.js from CDN via script tag
   */
  private async loadTesseract(): Promise<TesseractWorker> {
    if (this.tesseractWorker) {
      return this.tesseractWorker;
    }

    // Check if Tesseract is already loaded globally
    if (!('Tesseract' in window)) {
      // Load Tesseract via script tag
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src =
          'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
        document.head.appendChild(script);
      });
    }

    // Access Tesseract from window
    const Tesseract = (
      window as unknown as {
        Tesseract: { createWorker: (lang: string) => Promise<TesseractWorker> };
      }
    ).Tesseract;

    this.tesseractWorker = await Tesseract.createWorker('eng');
    return this.tesseractWorker;
  }

  /**
   * Recognize handwriting using Tesseract.js OCR
   */
  private async recognizeWithTesseract(): Promise<string | null> {
    if (!this.canvas) return null;

    try {
      const worker = await this.loadTesseract();
      const dataUrl = this.canvas.toDataURL('image/png');
      const result = await worker.recognize(dataUrl);

      const text = result.data.text.trim();

      return text || null;
    } catch (error) {
      console.error('Tesseract recognition failed:', error);
      return null;
    }
  }

  private async handleDone() {
    if (!this.hasContent || !this.canvas) {
      return;
    }

    this.isRecognizing = true;

    try {
      let recognizedText: string | null = null;

      // Use appropriate recognition method
      if (this.recognitionMethod === 'prompt-api') {
        recognizedText = await recognizeHandwriting(this.canvas);
      } else if (this.recognitionMethod === 'tesseract') {
        recognizedText = await this.recognizeWithTesseract();
      }

      if (recognizedText) {
        // Dispatch event with recognized text
        this.dispatchEvent(
          new CustomEvent('handwriting-complete', {
            bubbles: true,
            composed: true,
            detail: { text: recognizedText },
          })
        );

        // Close dialog
        this.closeDialog();
      } else {
        // Could show an error toast here, but for now just let user try again
        console.warn('No text recognized from handwriting');
      }
    } catch (error) {
      console.error('Handwriting recognition failed:', error);
    } finally {
      this.isRecognizing = false;
    }
  }

  private handleCancel() {
    this.closeDialog();
  }

  private closeDialog() {
    this.dialog?.hide();
    this.open = false;
    this.hasContent = false;
    this.isRecognizing = false;

    this.dispatchEvent(
      new CustomEvent('close', {
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`
      <md-dialog
        id="handwriting-dialog"
        label=${msg('Write your post')}
        ?fullscreen=${this.isMobile}
        no-backdrop-close
        @md-dialog-hide=${() => this.closeDialog()}
      >
        <div class="canvas-container">
          <canvas
            id="handwriting-canvas"
            @mousedown=${this.startPaint}
            @mousemove=${this.paint}
            @mouseup=${this.stopPaint}
            @mouseleave=${this.stopPaint}
            @touchstart=${this.startPaint}
            @touchmove=${this.paint}
            @touchend=${this.stopPaint}
            @touchcancel=${this.stopPaint}
          ></canvas>
          <span class="canvas-hint ${this.hasContent ? 'hidden' : ''}"
            >${msg('Write something here...')}</span
          >
        </div>

        <div slot="footer" class="dialog-actions">
          <div class="left-actions">
            <md-button
              variant="outlined"
              @click=${() => this.clearCanvas()}
              ?disabled=${this.isRecognizing}
            >
              <md-icon src="/assets/trash-outline.svg"></md-icon>
              ${msg('Clear')}
            </md-button>
          </div>

          <div class="right-actions">
            <md-button
              variant="text"
              @click=${() => this.handleCancel()}
              ?disabled=${this.isRecognizing}
            >
              ${msg('Cancel')}
            </md-button>
            <md-button
              variant="filled"
              pill
              class="${this.isRecognizing ? 'recognizing' : ''}"
              @click=${() => this.handleDone()}
              ?disabled=${!this.hasContent || this.isRecognizing}
            >
              ${
                this.isRecognizing
                  ? html`<span class="recognizing-spinner"></span> ${msg(
                        'Recognizing...'
                      )}`
                  : msg('Done')
              }
            </md-button>
          </div>
        </div>
      </md-dialog>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'handwriting-dialog': HandwritingDialog;
  }
}

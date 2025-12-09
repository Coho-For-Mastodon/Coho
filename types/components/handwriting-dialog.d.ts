import { LitElement } from 'lit';
import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-icon.js';
import './md/md-icon-button.js';
/**
 * Handwriting input dialog component
 * Provides a canvas for users to write text by hand, which is then
 * recognized using Chrome's on-device Prompt API
 */
export declare class HandwritingDialog extends LitElement {
  open: boolean;
  private isRecognizing;
  private hasContent;
  private isMobile;
  private recognitionMethod;
  private dialog;
  private canvas;
  private ctx;
  private isPainting;
  private currentColor;
  private brushSize;
  private tesseractWorker;
  static styles: import('lit').CSSResult;
  connectedCallback(): void;
  private checkRecognitionMethod;
  disconnectedCallback(): void;
  private handleMediaChange;
  updated(changedProperties: Map<PropertyKey, unknown>): void;
  private showDialog;
  private initCanvas;
  private getPosition;
  private startPaint;
  private paint;
  private stopPaint;
  private clearCanvas;
  /**
   * Lazy load Tesseract.js from CDN via script tag
   */
  private loadTesseract;
  /**
   * Recognize handwriting using Tesseract.js OCR
   */
  private recognizeWithTesseract;
  private handleDone;
  private handleCancel;
  private closeDialog;
  render(): import('lit-html').TemplateResult<1>;
}
declare global {
  interface HTMLElementTagNameMap {
    'handwriting-dialog': HandwritingDialog;
  }
}

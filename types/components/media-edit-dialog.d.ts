import { LitElement } from 'lit';
import './md/md-dialog.js';
import './md/md-button.js';
import './md/md-text-area.js';
import './md/md-skeleton.js';
export declare class MediaEditDialog extends LitElement {
    open: boolean;
    imageSrc: string;
    description: string;
    mediaId: string;
    imageLoaded: boolean;
    generating: boolean;
    promptAPIAvailable: boolean;
    connectedCallback(): void;
    static styles: import("lit").CSSResult;
    willUpdate(changedProperties: Map<string, unknown>): void;
    private handleImageLoad;
    private handleSave;
    private close;
    private handleDialogHide;
    private handleDialogShow;
    private handleGenerateAlt;
    render(): import("lit-html").TemplateResult<1>;
}

import { LitElement } from 'lit';
import './md/md-toast.js';
export declare class OfflineNotify extends LitElement {
    network_status: boolean;
    back_online: boolean;
    private offlineToast;
    private backOnlineToast;
    static styles: import("lit").CSSResult[];
    constructor();
    showOfflineToast(): void;
    showBackOnlineToast(): void;
    render(): import("lit-html").TemplateResult<1>;
}

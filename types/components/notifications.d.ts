import { LitElement } from 'lit';
import './user-profile';
import './timeline-item';
import './md/md-dialog';
import './md/md-switch';
import './md/md-button';
import './md/md-segmented-button';
import { Post } from '../interfaces/Post';
import { Notification } from '../interfaces/Notification';
export declare class Notifications extends LitElement {
    notifications: Notification[];
    subbed: boolean;
    activeSegment: string;
    static styles: import("lit").CSSResult[];
    firstUpdated(): Promise<void>;
    clear(): Promise<void>;
    sub(flag: boolean): Promise<void>;
    openPost(tweet: Post | undefined): Promise<void>;
    render(): import("lit-html").TemplateResult<1>;
}

import type { Notification as MastodonNotification } from '../interfaces/Notification';
export declare const getNotifications: (
  maxId?: string,
  limit?: number
) => Promise<MastodonNotification[]>;
export declare const clearNotifications: () => Promise<any>;
export declare const checkNewNotifications: () => Promise<boolean>;
export declare const markNotificationsRead: () => Promise<void>;
export declare const subToPush: () => Promise<void>;
export declare const modifyPush: (flags?: string[]) => Promise<void>;
export declare const unsubToPush: () => Promise<void>;

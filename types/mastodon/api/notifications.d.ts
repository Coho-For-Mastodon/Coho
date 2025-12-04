import { Notification } from '../types';
export declare const getNotifications: () => Promise<Notification[]>;
export declare const clearNotifications: () => Promise<any>;
export declare const checkNewNotifications: () => Promise<boolean>;
export declare const markNotificationsRead: () => Promise<void>;

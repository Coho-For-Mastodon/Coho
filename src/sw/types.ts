/// <reference lib="webworker" />
/**
 * Service Worker Type Definitions
 *
 * Shared types, interfaces, and type augmentations used across SW modules.
 * Split into generic (library-reusable) and Coho-specific types.
 */

import type { get, set } from 'idb-keyval';

// ============================================================================
// Generic SW Types (library-reusable)
// ============================================================================

/** Type augmentation for the Badging API (not yet in all TS libs) */
export interface NavigatorBadge {
  setAppBadge(contents?: number): Promise<void>;
  clearAppBadge(): Promise<void>;
}

/** Type augmentation for the Background Sync API */
export interface SyncManager {
  register(tag: string): Promise<void>;
  getTags(): Promise<string[]>;
}

/** A serialized request stored in the background sync queue */
export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  timestamp: number;
}

// ============================================================================
// Coho-specific Types
// ============================================================================

/** Mastodon notification object shape (subset used by the SW) */
export interface NotificationData {
  type:
    | 'mention'
    | 'reblog'
    | 'favourite'
    | 'follow'
    | 'poll'
    | 'follow_request'
    | 'status'
    | 'update';
  account: {
    id: string;
    display_name: string;
    url: string;
  };
  status?: {
    content: string;
  };
}

/** Mastodon Web Push payload */
export interface MastodonPushPayload {
  access_token: string;
  preferred_locale: string;
  notification_id: string;
  notification_type:
    | 'mention'
    | 'reblog'
    | 'favourite'
    | 'follow'
    | 'poll'
    | 'follow_request'
    | 'status'
    | 'update';
  icon: string;
  title: string;
  body: string;
}

/** Notification action for interactive notifications */
export interface NotificationAction {
  action: string;
  title: string;
}

/** PWA Widget definition (Windows Widgets API) */
export interface WidgetDefinition {
  msAcTemplate: string;
  data: string;
  tag: string;
}

export interface Widget {
  definition: WidgetDefinition;
}

export interface WidgetInstallEvent extends ExtendableEvent {
  widget: Widget;
}

export interface PeriodicSyncEvent extends ExtendableEvent {
  tag: string;
}

/** Push subscription change event (not yet in all TS libs) */
export interface PushSubscriptionChangeEvent extends ExtendableEvent {
  readonly oldSubscription: PushSubscription | null;
  readonly newSubscription: PushSubscription | null;
}

// ============================================================================
// Extended ServiceWorkerGlobalScope
// ============================================================================

/**
 * Augmented ServiceWorkerGlobalScope with Coho-specific properties.
 * Use this as the type for `self` in SW modules.
 */
export type CohoServiceWorkerGlobalScope = ServiceWorkerGlobalScope & {
  idbKeyval: {
    get: typeof get;
    set: typeof set;
  };
  widgets?: {
    updateByTag: (
      tag: string,
      payload: { template: string; data: string }
    ) => Promise<void>;
  };
  registration: ServiceWorkerRegistration & {
    sync: SyncManager;
  };
};

/**
 * Centralized typed custom events for the application.
 * Import these types to ensure type safety when dispatching and handling events.
 *
 * @example Dispatching:
 * ```typescript
 * this.dispatchEvent(new CustomEvent<TabChangeDetail>('tab-change', {
 *   detail: { panel: 'notifications' },
 *   bubbles: true,
 *   composed: true
 * }));
 * ```
 *
 * @example Handling:
 * ```typescript
 * handleTabChange(event: TabChangeEvent) {
 *   const panel = event.detail.panel; // properly typed as string
 * }
 * ```
 */

import type { Post } from '../interfaces/Post';

// ============================================================================
// Tab Events
// ============================================================================

/** Detail for tab-change events emitted by md-tabs */
export interface TabChangeDetail {
  panel: string;
}

/** Typed CustomEvent for tab-change */
export type TabChangeEvent = CustomEvent<TabChangeDetail>;

// ============================================================================
// Timeline / Post Events
// ============================================================================

/** Detail for replies events emitted when viewing post replies */
export interface RepliesDetail {
  data: Post[];
  id?: string;
}

/** Typed CustomEvent for replies */
export type RepliesEvent = CustomEvent<RepliesDetail>;

/** Detail for open events when opening a post in detail view */
export interface OpenPostDetail {
  tweet: Post;
}

/** Typed CustomEvent for open post */
export type OpenPostEvent = CustomEvent<OpenPostDetail>;

/** Detail for handle-summary events */
export interface HandleSummaryDetail {
  data: string;
}

/** Typed CustomEvent for handle-summary */
export type HandleSummaryEvent = CustomEvent<HandleSummaryDetail>;

/** Detail for handle-translating events */
export interface HandleTranslatingDetail {
  tweet: Post;
}

/** Typed CustomEvent for handle-translating */
export type HandleTranslatingEvent = CustomEvent<HandleTranslatingDetail>;

/** Detail for reply-clicked events */
export interface ReplyClickedDetail {
  post: Post;
}

/** Typed CustomEvent for reply-clicked */
export type ReplyClickedEvent = CustomEvent<ReplyClickedDetail>;

/** Detail for analyze events */
export interface AnalyzeEventDetail {
  data: unknown;
  imageData: unknown;
  tweet: Post;
}

/** Typed CustomEvent for analyze */
export type AnalyzeEvent = CustomEvent<AnalyzeEventDetail>;

/** Detail for openimage events */
export interface OpenImageDetail {
  imageURL: string;
}

/** Typed CustomEvent for openimage */
export type OpenImageEvent = CustomEvent<OpenImageDetail>;

// ============================================================================
// Header / Navigation Events
// ============================================================================

/** Typed CustomEvent for open-settings (no detail) */
export type OpenSettingsEvent = CustomEvent<void>;

/** Typed CustomEvent for open-theming (no detail) */
export type OpenThemingEvent = CustomEvent<void>;

/** Typed CustomEvent for open-bot-drawer (no detail) */
export type OpenBotDrawerEvent = CustomEvent<void>;

/** Typed CustomEvent for open-install (no detail) */
export type OpenInstallEvent = CustomEvent<void>;

export interface OpenAccountSwitcherDetail {
  origin?: { x: number; y: number };
}

/** Typed CustomEvent for open-account-switcher */
export type OpenAccountSwitcherEvent = CustomEvent<OpenAccountSwitcherDetail>;

// ============================================================================
// Account Session Events
// ============================================================================

export interface AccountChangedDetail {
  previousActiveAccountKey: string | null;
  newActiveAccountKey: string | null;
  reason: string;
}

export type AccountChangedEvent = CustomEvent<AccountChangedDetail>;

// ============================================================================
// Menu Events
// ============================================================================

/** Detail for menu-item-click events */
export interface MenuItemClickDetail {
  value?: string;
}

/** Typed CustomEvent for menu-item-click */
export type MenuItemClickEvent = CustomEvent<MenuItemClickDetail>;

// ============================================================================
// Segmented Button / Select Events
// ============================================================================

/** Detail for segment-change events */
export interface SegmentChangeDetail {
  value: string;
}

/** Typed CustomEvent for segment-change */
export type SegmentChangeEvent = CustomEvent<SegmentChangeDetail>;

/** Detail for select change events */
export interface SelectChangeDetail {
  value: string;
}

/** Typed CustomEvent for select change */
export type SelectChangeEvent = CustomEvent<SelectChangeDetail>;

// ============================================================================
// Media Events
// ============================================================================

/** Detail for preview-image events from image-carousel */
export interface PreviewImageDetail {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
  blurhash?: string;
  origin?: { x: number; y: number };
}

/** Typed CustomEvent for preview-image */
export type PreviewImageEvent = CustomEvent<PreviewImageDetail>;

/** Detail for media-edit save events */
export interface MediaEditSaveDetail {
  description: string;
}

/** Typed CustomEvent for media-edit save */
export type MediaEditSaveEvent = CustomEvent<MediaEditSaveDetail>;

// ============================================================================
// Theme Events
// ============================================================================

/** Detail for color-chosen events from theme picker */
export interface ColorChosenDetail {
  color: string;
}

/** Typed CustomEvent for color-chosen */
export type ColorChosenEvent = CustomEvent<ColorChosenDetail>;

// ============================================================================
// Form / Input Events
// ============================================================================

/** Detail for switch toggle events */
export interface SwitchChangeDetail {
  checked: boolean;
}

/** Typed CustomEvent for switch changes */
export type SwitchChangeEvent = CustomEvent<SwitchChangeDetail>;

/** Detail for checkbox toggle events */
export interface CheckboxChangeDetail {
  checked: boolean;
}

/** Typed CustomEvent for checkbox changes */
export type CheckboxChangeEvent = CustomEvent<CheckboxChangeDetail>;

// ============================================================================
// Server Selection Events (Login)
// ============================================================================

/** Detail for server-select events */
export interface ServerSelectDetail {
  server: string;
}

/** Typed CustomEvent for server-select */
export type ServerSelectEvent = CustomEvent<ServerSelectDetail>;

// ============================================================================
// Toast Events
// ============================================================================

/** Detail for toast action-click events */
export interface ToastActionClickDetail {
  action: string;
}

/** Typed CustomEvent for toast action-click */
export type ToastActionClickEvent = CustomEvent<ToastActionClickDetail>;

// ============================================================================
// Utility type for creating typed event handlers
// ============================================================================

/**
 * Helper type for creating event handler method signatures
 * @example
 * handleTabChange: TypedEventHandler<TabChangeDetail> = (e) => { ... }
 */
export type TypedEventHandler<T> = (event: CustomEvent<T>) => void;

/**
 * Helper type for creating async event handler method signatures
 * @example
 * handleTabChange: AsyncTypedEventHandler<TabChangeDetail> = async (e) => { ... }
 */
export type AsyncTypedEventHandler<T> = (
  event: CustomEvent<T>
) => Promise<void>;

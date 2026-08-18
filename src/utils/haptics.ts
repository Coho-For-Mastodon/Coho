import { Capacitor, registerPlugin } from '@capacitor/core';
import { getPlatform } from './platform';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';
export type SemanticHapticType =
  | 'confirm'
  | 'reject'
  | 'gestureStart'
  | 'gestureThreshold'
  | 'gestureEnd'
  | 'toggleOn'
  | 'toggleOff'
  | 'segmentTick'
  | 'segmentFrequentTick'
  | 'longPress'
  | 'contextClick'
  | 'clockTick'
  | 'click';

interface RichHapticsPlugin {
  perform(options: { type: SemanticHapticType }): Promise<void>;
}

let _hapticsEnabled: boolean | null = null;
let richHapticsBridge: RichHapticsPlugin | null = null;

function getRichHapticsBridge(): RichHapticsPlugin | null {
  if (richHapticsBridge) return richHapticsBridge;
  if (Capacitor.isNativePlatform() && getPlatform() === 'android') {
    try {
      richHapticsBridge =
        registerPlugin<RichHapticsPlugin>('RichHapticsBridge');
      return richHapticsBridge;
    } catch {
      return null;
    }
  }
  return null;
}

async function isEnabled(): Promise<boolean> {
  if (_hapticsEnabled !== null) return _hapticsEnabled;
  try {
    const { getSettings } = await import('../services/settings');
    const settings = await getSettings();
    _hapticsEnabled = settings.haptics !== false;
  } catch {
    _hapticsEnabled = true;
  }
  return _hapticsEnabled;
}

/** Call after the user changes the haptics setting to update the cache. */
export function setHapticsEnabled(enabled: boolean) {
  _hapticsEnabled = enabled;
}

/**
 * Perform a rich semantic system haptic feedback.
 * Uses Android HapticFeedbackConstants on Android 11+ / 14+,
 * and gracefully falls back on iOS and Web.
 */
export async function performHaptic(type: SemanticHapticType): Promise<void> {
  try {
    if (!(await isEnabled())) return;

    const bridge = getRichHapticsBridge();
    if (bridge) {
      await bridge.perform({ type });
      return;
    }

    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle, NotificationType } =
        await import('@capacitor/haptics');
      switch (type) {
        case 'confirm':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'reject':
          await Haptics.notification({ type: NotificationType.Error });
          break;
        case 'toggleOn':
        case 'toggleOff':
        case 'segmentTick':
        case 'segmentFrequentTick':
        case 'clockTick':
        case 'gestureStart':
          await Haptics.selectionChanged();
          break;
        case 'gestureThreshold':
        case 'gestureEnd':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'longPress':
        case 'contextClick':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'click':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        default:
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
      }
    } else if (navigator.vibrate) {
      switch (type) {
        case 'confirm':
          navigator.vibrate([12, 40, 15]);
          break;
        case 'reject':
          navigator.vibrate([25, 40, 25]);
          break;
        case 'gestureThreshold':
        case 'gestureEnd':
          navigator.vibrate(20);
          break;
        case 'longPress':
        case 'contextClick':
          navigator.vibrate(30);
          break;
        case 'segmentTick':
        case 'segmentFrequentTick':
        case 'toggleOn':
        case 'toggleOff':
        case 'clockTick':
        case 'gestureStart':
          navigator.vibrate(8);
          break;
        case 'click':
        default:
          navigator.vibrate(10);
          break;
      }
    }
  } catch {
    // Haptics should never throw or block the UI
  }
}

/**
 * Trigger a crisp, positive confirmation pop.
 * Ideal for: Favoriting, Boosting, Bookmarking, and successfully publishing a post.
 */
export async function hapticConfirm(): Promise<void> {
  return performHaptic('confirm');
}

/**
 * Trigger a dull, low-pitch double bump.
 * Ideal for: Exceeding character count limits, blocking an account, or failed operations.
 */
export async function hapticReject(): Promise<void> {
  return performHaptic('reject');
}

/**
 * Trigger a toggle click (upward click when turning ON, subtle tick when turning OFF).
 * Ideal for: Switches, checkboxes, Content Warning toggles.
 */
export async function hapticToggle(checked: boolean): Promise<void> {
  return performHaptic(checked ? 'toggleOn' : 'toggleOff');
}

/**
 * Trigger a mechanical snap / threshold activation.
 * Ideal for: The exact moment pull-to-refresh crosses the reload trigger point.
 */
export async function hapticThreshold(): Promise<void> {
  return performHaptic('gestureThreshold');
}

/**
 * Trigger a subtle gesture start micro-tick.
 * Ideal for: Starting pull-to-refresh drag or drag-and-drop.
 */
export async function hapticGestureStart(): Promise<void> {
  return performHaptic('gestureStart');
}

/**
 * Trigger a subtle segment tick.
 * Ideal for: Tab switches (Home, Search, Notifications, Messages), segmented button choices.
 */
export async function hapticSegmentTick(): Promise<void> {
  return performHaptic('segmentTick');
}

/**
 * Trigger a deep haptic sensation for long-presses.
 * Ideal for: Post action menus, avatar preview sheets.
 */
export async function hapticLongPress(): Promise<void> {
  return performHaptic('longPress');
}

/**
 * Backwards-compatible impact haptic.
 */
export async function hapticImpact(style: ImpactStyle = 'light') {
  if (style === 'heavy') return performHaptic('longPress');
  if (style === 'medium') return performHaptic('gestureThreshold');
  return performHaptic('click');
}

/**
 * Backwards-compatible notification haptic.
 */
export async function hapticNotification(type: NotificationType = 'success') {
  if (type === 'error' || type === 'warning') return hapticReject();
  return hapticConfirm();
}

/**
 * Backwards-compatible selection tick.
 */
export async function hapticSelection() {
  return performHaptic('segmentTick');
}

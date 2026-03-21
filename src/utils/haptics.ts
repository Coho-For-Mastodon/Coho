import { Capacitor } from '@capacitor/core';

type ImpactStyle = 'light' | 'medium' | 'heavy';
type NotificationType = 'success' | 'warning' | 'error';

let _hapticsEnabled: boolean | null = null;

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

const vibrateDurations: Record<ImpactStyle, number> = {
  light: 10,
  medium: 20,
  heavy: 30,
};

const notificationDurations: Record<NotificationType, number> = {
  success: 15,
  warning: 20,
  error: 30,
};

/**
 * Trigger an impact haptic. Use for discrete user actions like tapping
 * a like/boost/bookmark button.
 */
export async function hapticImpact(style: ImpactStyle = 'light') {
  try {
    if (!(await isEnabled())) return;

    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const map: Record<string, import('@capacitor/haptics').ImpactStyle> = {
        light: ImpactStyle.Light,
        medium: ImpactStyle.Medium,
        heavy: ImpactStyle.Heavy,
      };
      await Haptics.impact({ style: map[style] });
    } else if (navigator.vibrate) {
      navigator.vibrate(vibrateDurations[style]);
    }
  } catch {
    // Haptics should never throw or block the UI
  }
}

/**
 * Trigger a notification haptic. Use for outcome feedback like
 * successfully publishing a post.
 */
export async function hapticNotification(type: NotificationType = 'success') {
  try {
    if (!(await isEnabled())) return;

    if (Capacitor.isNativePlatform()) {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      const map: Record<string, import('@capacitor/haptics').NotificationType> =
        {
          success: NotificationType.Success,
          warning: NotificationType.Warning,
          error: NotificationType.Error,
        };
      await Haptics.notification({ type: map[type] });
    } else if (navigator.vibrate) {
      navigator.vibrate(notificationDurations[type]);
    }
  } catch {
    // Haptics should never throw or block the UI
  }
}

/**
 * Trigger a light selection tick. Use for selection changes or
 * pull-to-refresh thresholds.
 */
export async function hapticSelection() {
  try {
    if (!(await isEnabled())) return;

    if (Capacitor.isNativePlatform()) {
      const { Haptics } = await import('@capacitor/haptics');
      await Haptics.selectionChanged();
    } else if (navigator.vibrate) {
      navigator.vibrate(5);
    }
  } catch {
    // Haptics should never throw or block the UI
  }
}

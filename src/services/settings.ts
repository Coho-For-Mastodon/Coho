export interface Settings {
  primary_color?: string;
  font_size?: string;
  data_saver?: boolean;
  wellness?: boolean;
  focus?: boolean;
  sensitive?: boolean;
  haptics?: boolean;
  experimental_3d_timeline?: boolean;
}

export const SETTINGS_CHANGED_EVENT = 'coho-settings-changed';

const defaultSettings = {
  primary_color: '',
  font_size: '16px',
  data_saver: false,
  wellness: false,
  focus: false,
  sensitive: false,
  haptics: true,
  experimental_3d_timeline: false,
};

export async function getSettings(): Promise<Settings> {
  const { get } = await import('idb-keyval');

  const settings = await get('settings');
  return settings ? settings : defaultSettings;
}

export async function setSettings(settings: Settings) {
  const currentSettings = await getSettings();

  const savedSettings = {
    primary_color: settings.primary_color || currentSettings.primary_color,
    font_size: settings.font_size || currentSettings.font_size,
    data_saver: Object.keys(settings).includes('data_saver')
      ? settings.data_saver
      : currentSettings.data_saver,
    wellness: Object.keys(settings).includes('wellness')
      ? settings.wellness
      : currentSettings.wellness,
    focus: Object.keys(settings).includes('focus')
      ? settings.focus
      : currentSettings.focus,
    sensitive: Object.keys(settings).includes('sensitive')
      ? settings.sensitive
      : currentSettings.sensitive,
    haptics: Object.keys(settings).includes('haptics')
      ? settings.haptics
      : currentSettings.haptics,
    experimental_3d_timeline: Object.keys(settings).includes(
      'experimental_3d_timeline'
    )
      ? settings.experimental_3d_timeline
      : currentSettings.experimental_3d_timeline,
  };

  // Also store theme color in localStorage for instant access on page load
  if (savedSettings.primary_color) {
    localStorage.setItem('coho-theme-color', savedSettings.primary_color);
  }

  const { set } = await import('idb-keyval');

  await set('settings', savedSettings);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<Settings>(SETTINGS_CHANGED_EVENT, {
        detail: savedSettings,
      })
    );
  }
}

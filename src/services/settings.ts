export interface Settings {
  primary_color?: string;
  font_size?: string;
  data_saver?: boolean;
  wellness?: boolean;
  focus?: boolean;
  sensitive?: boolean;
}

const defaultSettings = {
  primary_color: '',
  font_size: '16px',
  data_saver: false,
  wellness: false,
  focus: false,
  sensitive: false,
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
  };

  // Also store theme color in localStorage for instant access on page load
  if (savedSettings.primary_color) {
    localStorage.setItem('coho-theme-color', savedSettings.primary_color);
  }

  const { set } = await import('idb-keyval');

  await set('settings', savedSettings);
}

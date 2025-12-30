import { describe, it, expect, beforeEach } from 'vitest';
import { get, set, clear } from 'idb-keyval';

// Import the service functions we want to test
import {
  getSettings,
  setSettings,
  type Settings,
} from '../../src/services/settings';

describe('settings service', () => {
  beforeEach(async () => {
    // Clear IndexedDB before each test
    await clear();
  });

  describe('getSettings', () => {
    it('returns default settings when no settings are stored', async () => {
      const settings = await getSettings();

      expect(settings).toBeDefined();
      expect(settings.primary_color).toBe('#809bce');
      expect(settings.font_size).toBe('16px');
      expect(settings.data_saver).toBe(false);
      expect(settings.wellness).toBe(false);
      expect(settings.focus).toBe(false);
      expect(settings.sensitive).toBe(false);
    });

    it('returns stored settings when they exist', async () => {
      const customSettings: Settings = {
        primary_color: '#ff0000',
        font_size: '18px',
        data_saver: true,
        wellness: true,
        focus: false,
        sensitive: true,
      };

      await set('settings', customSettings);

      const settings = await getSettings();

      expect(settings.primary_color).toBe('#ff0000');
      expect(settings.font_size).toBe('18px');
      expect(settings.data_saver).toBe(true);
      expect(settings.wellness).toBe(true);
      expect(settings.sensitive).toBe(true);
    });
  });

  describe('setSettings', () => {
    it('saves settings to IndexedDB', async () => {
      await setSettings({
        primary_color: '#00ff00',
      });

      const stored = await get('settings');
      expect(stored.primary_color).toBe('#00ff00');
    });

    it('merges partial settings with existing defaults', async () => {
      await setSettings({
        data_saver: true,
      });

      const settings = await getSettings();

      // Should have the new value
      expect(settings.data_saver).toBe(true);

      // Should preserve defaults for other fields
      expect(settings.primary_color).toBe('#809bce');
      expect(settings.font_size).toBe('16px');
    });

    it('can update boolean settings to false', async () => {
      // First set to true
      await setSettings({ wellness: true });
      let settings = await getSettings();
      expect(settings.wellness).toBe(true);

      // Then set to false
      await setSettings({ wellness: false });
      settings = await getSettings();
      expect(settings.wellness).toBe(false);
    });

    it('preserves existing settings when updating', async () => {
      // Set initial settings
      await setSettings({
        primary_color: '#123456',
        data_saver: true,
      });

      // Update only one field
      await setSettings({
        wellness: true,
      });

      const settings = await getSettings();

      // Original values should be preserved
      expect(settings.primary_color).toBe('#123456');
      expect(settings.data_saver).toBe(true);

      // New value should be set
      expect(settings.wellness).toBe(true);
    });
  });

  describe('settings types', () => {
    it('handles all setting properties correctly', async () => {
      const fullSettings: Settings = {
        primary_color: '#abcdef',
        font_size: '20px',
        data_saver: true,
        wellness: true,
        focus: true,
        sensitive: true,
      };

      await setSettings(fullSettings);
      const retrieved = await getSettings();

      expect(retrieved).toEqual(fullSettings);
    });
  });
});

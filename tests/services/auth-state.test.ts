import { describe, it, expect, beforeEach } from 'vitest';
import {
  isGuestMode,
  getGuestServer,
  getEffectiveServer,
  enterGuestMode,
  exitGuestMode,
  isExplicitGuestMode,
} from '../../src/services/auth-state';

describe('auth-state service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('isGuestMode', () => {
    it('returns true when no access token', () => {
      expect(isGuestMode()).toBe(true);
    });

    it('returns true when access token is empty string', () => {
      localStorage.setItem('accessToken', '');
      expect(isGuestMode()).toBe(true);
    });

    it('returns false when access token exists', () => {
      localStorage.setItem('accessToken', 'valid-token');
      expect(isGuestMode()).toBe(false);
    });
  });

  describe('getGuestServer', () => {
    it('always returns mastodon.social', () => {
      expect(getGuestServer()).toBe('mastodon.social');
    });
  });

  describe('getEffectiveServer', () => {
    it('returns mastodon.social for guest users', () => {
      expect(getEffectiveServer()).toBe('mastodon.social');
    });

    it('returns mastodon.social when server set but not authenticated', () => {
      localStorage.setItem('server', 'tech.lgbt');
      expect(getEffectiveServer()).toBe('mastodon.social');
    });

    it('returns user server when authenticated', () => {
      localStorage.setItem('accessToken', 'valid-token');
      localStorage.setItem('server', 'tech.lgbt');
      expect(getEffectiveServer()).toBe('tech.lgbt');
    });
  });

  describe('enterGuestMode', () => {
    it('clears auth tokens', () => {
      localStorage.setItem('accessToken', 'token');
      localStorage.setItem('token', 'token');

      enterGuestMode();

      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('token')).toBeNull();
    });

    it('sets server to guest server', () => {
      enterGuestMode();

      expect(localStorage.getItem('server')).toBe('mastodon.social');
    });

    it('sets guestMode flag', () => {
      enterGuestMode();

      expect(localStorage.getItem('guestMode')).toBe('true');
    });
  });

  describe('exitGuestMode', () => {
    it('removes guestMode flag', () => {
      localStorage.setItem('guestMode', 'true');

      exitGuestMode();

      expect(localStorage.getItem('guestMode')).toBeNull();
    });
  });

  describe('isExplicitGuestMode', () => {
    it('returns false when guestMode not set', () => {
      expect(isExplicitGuestMode()).toBe(false);
    });

    it('returns true when guestMode is true', () => {
      localStorage.setItem('guestMode', 'true');
      expect(isExplicitGuestMode()).toBe(true);
    });

    it('returns false when guestMode has other value', () => {
      localStorage.setItem('guestMode', 'false');
      expect(isExplicitGuestMode()).toBe(false);
    });
  });

  describe('auth flow integration', () => {
    it('enterGuestMode followed by isGuestMode returns true', () => {
      enterGuestMode();
      expect(isGuestMode()).toBe(true);
    });

    it('authenticated user then exitGuestMode works correctly', () => {
      // Simulate entering guest mode
      enterGuestMode();
      expect(isExplicitGuestMode()).toBe(true);

      // Simulate login
      localStorage.setItem('accessToken', 'new-token');
      localStorage.setItem('server', 'tech.lgbt');
      exitGuestMode();

      expect(isGuestMode()).toBe(false);
      expect(isExplicitGuestMode()).toBe(false);
      expect(getEffectiveServer()).toBe('tech.lgbt');
    });
  });
});

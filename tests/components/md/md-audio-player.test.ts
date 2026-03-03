import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  fixture,
  html,
  elementUpdated,
  cleanupFixtures,
} from '../../test-utils';
import '../../../src/components/md/md-audio-player';
import type { MdAudioPlayer } from '../../../src/components/md/md-audio-player';

describe('md-audio-player', () => {
  beforeEach(() => {
    cleanupFixtures();
  });

  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player></md-audio-player>`
      );

      expect(el).toBeDefined();
      expect(el.src).toBe('');
      expect(el.preload).toBe('metadata');
    });

    it('renders play button', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player></md-audio-player>`
      );

      const playButton = el.shadowRoot?.querySelector('.play-button');
      expect(playButton).toBeDefined();
    });

    it('renders progress track', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player></md-audio-player>`
      );

      const track = el.shadowRoot?.querySelector('.progress-track');
      expect(track).toBeDefined();
    });

    it('renders seek input range', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player></md-audio-player>`
      );

      const input = el.shadowRoot?.querySelector(
        '.progress-input'
      ) as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input?.type).toBe('range');
    });

    it('renders time display', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player></md-audio-player>`
      );

      const timeSpans = el.shadowRoot?.querySelectorAll('.time span');
      expect(timeSpans?.length).toBe(2);
      // Current time should be 0:00
      expect(timeSpans?.[0]?.textContent).toBe('0:00');
      // Duration should be -:-- while loading
      expect(timeSpans?.[1]?.textContent).toBe('-:--');
    });
  });

  describe('properties', () => {
    it('accepts src property', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player
          src="https://example.com/audio.mp3"
        ></md-audio-player>`
      );

      expect(el.src).toBe('https://example.com/audio.mp3');
    });

    it('accepts label property', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player label="Test audio"></md-audio-player>`
      );

      expect(el.label).toBe('Test audio');
      const region = el.shadowRoot?.querySelector('[role="region"]');
      expect(region?.getAttribute('aria-label')).toBe('Test audio');
    });

    it('accepts preload property', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player preload="none"></md-audio-player>`
      );

      expect(el.preload).toBe('none');
    });
  });

  describe('accessibility', () => {
    it('has region role on player container', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player></md-audio-player>`
      );

      const region = el.shadowRoot?.querySelector('[role="region"]');
      expect(region).toBeDefined();
    });

    it('play button has aria-label', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player></md-audio-player>`
      );

      const playButton = el.shadowRoot?.querySelector('.play-button');
      expect(playButton?.getAttribute('aria-label')).toBeTruthy();
    });

    it('seek slider has appropriate ARIA attributes', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player></md-audio-player>`
      );

      const input = el.shadowRoot?.querySelector('.progress-input');
      expect(input?.getAttribute('aria-label')).toBeTruthy();
      expect(input?.getAttribute('aria-valuemin')).toBe('0');
      expect(input?.getAttribute('aria-valuenow')).toBe('0');
    });
  });

  describe('playback behavior', () => {
    let mockPlay: ReturnType<typeof vi.fn>;
    let mockPause: ReturnType<typeof vi.fn>;
    let OriginalAudio: typeof Audio;

    beforeEach(() => {
      mockPlay = vi.fn().mockResolvedValue(undefined);
      mockPause = vi.fn();
      OriginalAudio = globalThis.Audio;

      const play = mockPlay;
      const pause = mockPause;

      globalThis.Audio = class MockAudio {
        play = play;
        pause = pause;
        src = '';
        preload = '';
        currentTime = 0;
        duration = 120;
        addEventListener = vi.fn();
        removeEventListener = vi.fn();
        load = vi.fn();
      } as unknown as typeof Audio;
    });

    afterEach(() => {
      globalThis.Audio = OriginalAudio;
    });

    it('dispatches play event when play button is clicked', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player src="test.mp3"></md-audio-player>`
      );

      const playHandler = vi.fn();
      el.addEventListener('play', playHandler);

      const playButton = el.shadowRoot?.querySelector(
        '.play-button'
      ) as HTMLButtonElement;
      playButton.click();

      // Wait for the async play() promise to resolve
      await new Promise((r) => setTimeout(r, 0));
      await elementUpdated(el);

      expect(mockPlay).toHaveBeenCalledTimes(1);
      expect(playHandler).toHaveBeenCalledTimes(1);
      // Button label should now indicate pause
      expect(playButton.getAttribute('aria-label')).toBe('Pause');
    });

    it('dispatches pause event when paused', async () => {
      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player src="test.mp3"></md-audio-player>`
      );

      const playButton = el.shadowRoot?.querySelector(
        '.play-button'
      ) as HTMLButtonElement;

      // Click to play first
      playButton.click();
      await new Promise((r) => setTimeout(r, 0));
      await elementUpdated(el);

      const pauseHandler = vi.fn();
      el.addEventListener('pause', pauseHandler);

      // Click again to pause
      playButton.click();
      await new Promise((r) => setTimeout(r, 0));
      await elementUpdated(el);

      expect(mockPause).toHaveBeenCalledTimes(1);
      expect(pauseHandler).toHaveBeenCalledTimes(1);
      // Button label should now indicate play
      expect(playButton.getAttribute('aria-label')).toBe('Play');
    });

    it('dispatches error event when play() rejects', async () => {
      const playError = new Error('NotAllowedError');
      mockPlay.mockRejectedValueOnce(playError);

      const el = await fixture<MdAudioPlayer>(
        html`<md-audio-player src="test.mp3"></md-audio-player>`
      );

      const errorHandler = vi.fn();
      el.addEventListener('error', errorHandler);

      const playButton = el.shadowRoot?.querySelector(
        '.play-button'
      ) as HTMLButtonElement;
      playButton.click();

      // Wait for the rejected promise to propagate
      await new Promise((r) => setTimeout(r, 0));
      await elementUpdated(el);

      expect(errorHandler).toHaveBeenCalledTimes(1);
      const event = errorHandler.mock.calls[0][0] as CustomEvent;
      expect(event.detail.error).toBe(playError);
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { fixture, html, elementUpdated } from '../../test-utils';
import '../../../src/components/md/md-segmented-button';
import type { MdSegmentedButton } from '../../../src/components/md/md-segmented-button';

describe('md-segmented-button', () => {
  describe('rendering', () => {
    it('renders with default properties', async () => {
      const el = await fixture<MdSegmentedButton>(
        html`<md-segmented-button></md-segmented-button>`
      );

      expect(el).toBeDefined();
      expect(el.value).toBe('');
    });

    it('renders container with role="group"', async () => {
      const el = await fixture<MdSegmentedButton>(
        html`<md-segmented-button></md-segmented-button>`
      );
      const container = el.shadowRoot!.querySelector('.container');

      expect(container).toBeDefined();
      expect(container?.getAttribute('role')).toBe('radiogroup');
    });

    it('renders with segments', async () => {
      const el = await fixture<MdSegmentedButton>(html`
        <md-segmented-button>
          <md-segment value="all">All</md-segment>
          <md-segment value="mentions">Mentions</md-segment>
        </md-segmented-button>
      `);
      const segments = el.querySelectorAll('md-segment');

      expect(segments.length).toBe(2);
    });
  });

  describe('value property', () => {
    it('reflects value attribute', async () => {
      const el = await fixture<MdSegmentedButton>(
        html`<md-segmented-button value="mentions"></md-segmented-button>`
      );

      expect(el.value).toBe('mentions');
      expect(el.getAttribute('value')).toBe('mentions');
    });

    it('auto-selects first segment when no value specified', async () => {
      const el = await fixture<MdSegmentedButton>(html`
        <md-segmented-button>
          <md-segment value="all">All</md-segment>
          <md-segment value="mentions">Mentions</md-segment>
        </md-segmented-button>
      `);
      await elementUpdated(el);

      const firstSegment = el.querySelector('md-segment[value="all"]');
      expect(firstSegment?.hasAttribute('selected')).toBe(true);
    });

    it('sets initial value from property', async () => {
      const el = await fixture<MdSegmentedButton>(html`
        <md-segmented-button value="mentions">
          <md-segment value="all">All</md-segment>
          <md-segment value="mentions">Mentions</md-segment>
        </md-segmented-button>
      `);
      await elementUpdated(el);

      const selectedSegment = el.querySelector('md-segment[value="mentions"]');
      expect(selectedSegment?.hasAttribute('selected')).toBe(true);
    });

    it('updates selected segment when value changes', async () => {
      const el = await fixture<MdSegmentedButton>(html`
        <md-segmented-button value="all">
          <md-segment value="all">All</md-segment>
          <md-segment value="mentions">Mentions</md-segment>
        </md-segmented-button>
      `);
      await elementUpdated(el);

      el.value = 'mentions';
      await elementUpdated(el);

      const allSegment = el.querySelector('md-segment[value="all"]');
      const mentionsSegment = el.querySelector('md-segment[value="mentions"]');

      expect(allSegment?.hasAttribute('selected')).toBe(false);
      expect(mentionsSegment?.hasAttribute('selected')).toBe(true);
    });
  });

  describe('segment-change event', () => {
    it('dispatches segment-change when segment is clicked', async () => {
      const el = await fixture<MdSegmentedButton>(html`
        <md-segmented-button value="all">
          <md-segment value="all">All</md-segment>
          <md-segment value="mentions">Mentions</md-segment>
        </md-segmented-button>
      `);
      await elementUpdated(el);

      const changeHandler = vi.fn();
      el.addEventListener('segment-change', changeHandler);

      const mentionsSegment = el.querySelector(
        'md-segment[value="mentions"]'
      ) as MdSegment;
      // Click the button inside the segment
      const button = mentionsSegment.shadowRoot!.querySelector(
        'button'
      ) as HTMLElement;
      button.click();
      await elementUpdated(el);

      expect(changeHandler).toHaveBeenCalled();
      expect(changeHandler.mock.calls[0][0].detail.value).toBe('mentions');
    });

    it('does not dispatch when clicking already selected segment', async () => {
      const el = await fixture<MdSegmentedButton>(html`
        <md-segmented-button value="all">
          <md-segment value="all">All</md-segment>
          <md-segment value="mentions">Mentions</md-segment>
        </md-segmented-button>
      `);
      await elementUpdated(el);

      const changeHandler = vi.fn();
      el.addEventListener('segment-change', changeHandler);

      const allSegment = el.querySelector(
        'md-segment[value="all"]'
      ) as MdSegment;
      // Click the button inside the segment
      const button = allSegment.shadowRoot!.querySelector(
        'button'
      ) as HTMLElement;
      button.click();
      await elementUpdated(el);

      expect(changeHandler).not.toHaveBeenCalled();
    });
  });

  describe('slotchange handling', () => {
    it('updates segments when slot content changes', async () => {
      const el = await fixture<MdSegmentedButton>(html`
        <md-segmented-button value="all">
          <md-segment value="all">All</md-segment>
        </md-segmented-button>
      `);
      await elementUpdated(el);

      // Add a new segment
      const newSegment = document.createElement('md-segment');
      newSegment.setAttribute('value', 'new');
      newSegment.textContent = 'New';
      el.appendChild(newSegment);
      await elementUpdated(el);

      const segments = el.querySelectorAll('md-segment');
      expect(segments.length).toBe(2);
    });
  });
});

describe('md-segment', () => {
  describe('selected state', () => {
    it('reflects selected attribute', async () => {
      const el = await fixture(
        html`<md-segment value="test" selected>Test</md-segment>`
      );

      expect(el.hasAttribute('selected')).toBe(true);
    });
  });

  describe('events', () => {
    it('dispatches segment-selected on click', async () => {
      const el = await fixture(
        html`<md-segment value="test">Test</md-segment>`
      );
      const selectHandler = vi.fn();

      el.addEventListener('segment-selected', selectHandler);
      // Click the button inside the segment
      const button = el.shadowRoot!.querySelector('button') as HTMLElement;
      button.click();

      expect(selectHandler).toHaveBeenCalled();
      expect(selectHandler.mock.calls[0][0].detail.value).toBe('test');
    });
  });
});

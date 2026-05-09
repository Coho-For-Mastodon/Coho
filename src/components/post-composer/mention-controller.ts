import { searchAccounts } from '../../services/account';
import {
  estimateMentionDropdownHeight,
  findMentionMatch,
  getCaretCoordinates,
} from '../../utils/mention-utils';

import type { Account as MastodonAccount } from '../../mastodon/types/account';

export interface MentionControllerState {
  mentionOpen: boolean;
  mentionQuery: string;
  mentionResults: MastodonAccount[];
  mentionLoading: boolean;
  mentionActiveIndex: number;
  mentionAnchorLeft: number;
  mentionAnchorTop: number;
  mentionDropdownWidth: number;
  mentionAnchorReady: boolean;
}

interface MentionControllerHost {
  getState: () => MentionControllerState;
  setState: (patch: Partial<MentionControllerState>) => void;
  getNativeTextArea: () => HTMLTextAreaElement | null;
  getTextAreaWrapper: () => HTMLElement | null;
  getComposerValue: () => string;
  setComposerValue: (value: string, nextCursor?: number) => void;
}

export class PostComposerMentionController {
  private mentionQueryRange: { start: number; end: number } | null = null;
  private mentionSearchTimer: number | null = null;
  private mentionRequestId = 0;

  constructor(private host: MentionControllerHost) {}

  handleCaretMove() {
    const nativeTextArea = this.host.getNativeTextArea();
    if (!nativeTextArea) return;

    const cursor = nativeTextArea.selectionStart ?? nativeTextArea.value.length;
    const state = this.host.getState();

    if (!state.mentionOpen) {
      return;
    }

    this.updateSuggestions(nativeTextArea.value, cursor, nativeTextArea);
  }

  updateSuggestions(
    value: string,
    cursor: number,
    nativeTextArea: HTMLTextAreaElement | null
  ) {
    const mentionMatch = findMentionMatch(value, cursor);
    if (!mentionMatch) {
      this.close();
      return;
    }

    const query = mentionMatch.query;
    this.mentionQueryRange = {
      start: mentionMatch.start,
      end: mentionMatch.end,
    };

    if (query.length === 0) {
      this.close();
      return;
    }

    const state = this.host.getState();
    const isSameQuery = query === state.mentionQuery && state.mentionOpen;

    if (nativeTextArea) {
      this.updateCaretPosition(nativeTextArea, cursor);
    }

    this.host.setState({ mentionOpen: true });

    if (isSameQuery) {
      return;
    }

    this.host.setState({ mentionQuery: query });
    this.fetchMentionResults(query);
  }

  moveSelection(step: number) {
    const state = this.host.getState();
    if (state.mentionResults.length === 0) return;

    const nextIndex =
      (state.mentionActiveIndex + step + state.mentionResults.length) %
      state.mentionResults.length;
    this.host.setState({ mentionActiveIndex: nextIndex });
  }

  applyMention(account: MastodonAccount) {
    if (!this.mentionQueryRange) return;

    const currentValue = this.host.getComposerValue();
    const { start, end } = this.mentionQueryRange;
    const prefix = currentValue.slice(0, start);
    const suffix = currentValue.slice(end);
    const mentionText = `@${account.acct}`;
    const needsSpace = suffix.length === 0 || !/^\s/.test(suffix);
    const insertText = mentionText + (needsSpace ? ' ' : '');
    const nextValue = `${prefix}${insertText}${suffix}`;

    this.host.setComposerValue(nextValue, prefix.length + insertText.length);
    this.close();
  }

  close() {
    if (this.mentionSearchTimer !== null) {
      window.clearTimeout(this.mentionSearchTimer);
    }

    this.mentionSearchTimer = null;
    this.mentionRequestId += 1;
    this.mentionQueryRange = null;
    this.host.setState({
      mentionOpen: false,
      mentionQuery: '',
      mentionResults: [],
      mentionLoading: false,
      mentionActiveIndex: -1,
      mentionAnchorReady: false,
    });
  }

  destroy() {
    this.close();
  }

  private updateCaretPosition(textarea: HTMLTextAreaElement, cursor: number) {
    const wrapper = this.host.getTextAreaWrapper();
    if (!wrapper) return;

    const state = this.host.getState();
    const coords = getCaretCoordinates(textarea, cursor);
    const wrapperRect = wrapper.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    const width = Math.min(320, Math.max(220, wrapperRect.width - 16));

    let left = textareaRect.left - wrapperRect.left + coords.left;
    left = Math.max(8, Math.min(left, wrapperRect.width - width - 8));

    const estimatedHeight = estimateMentionDropdownHeight(
      state.mentionResults.length,
      state.mentionLoading
    );
    const belowTop =
      textareaRect.top - wrapperRect.top + coords.top + coords.lineHeight + 6;
    const aboveTop =
      textareaRect.top - wrapperRect.top + coords.top - estimatedHeight - 6;
    const spaceBelow = wrapperRect.height - belowTop;
    const spaceAbove = textareaRect.top - wrapperRect.top + coords.top - 6;

    const top =
      spaceBelow >= estimatedHeight || spaceBelow >= spaceAbove
        ? belowTop
        : Math.max(6, aboveTop);

    this.host.setState({
      mentionAnchorLeft: left,
      mentionAnchorTop: top,
      mentionDropdownWidth: width,
      mentionAnchorReady: true,
    });
  }

  private fetchMentionResults(query: string) {
    if (this.mentionSearchTimer !== null) {
      window.clearTimeout(this.mentionSearchTimer);
    }

    this.mentionSearchTimer = window.setTimeout(async () => {
      const requestId = ++this.mentionRequestId;
      this.host.setState({ mentionLoading: true });

      try {
        const results = await searchAccounts(query, 6);
        if (requestId !== this.mentionRequestId) return;

        this.host.setState({
          mentionResults: results || [],
          mentionActiveIndex: results && results.length > 0 ? 0 : -1,
        });
        this.handleCaretMove();
      } catch (error) {
        console.error('[PostComposer] Mention search failed:', error);
        if (requestId !== this.mentionRequestId) return;

        this.host.setState({
          mentionResults: [],
          mentionActiveIndex: -1,
        });
      } finally {
        if (requestId === this.mentionRequestId) {
          this.host.setState({
            mentionLoading: false,
            mentionOpen: true,
          });
        }
      }
    }, 200);
  }
}

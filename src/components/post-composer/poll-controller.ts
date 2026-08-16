import { msg } from '@lit/localize';
import { showInfoToast } from '../../utils/optimistic-updates';
import type { ComposerPollPayload } from './types';

export interface PollControllerState {
  pollEnabled: boolean;
  pollOptions: string[];
  pollDurationSeconds: number;
  pollMultiple: boolean;
  pollError: string | null;
}

export interface PollControllerHost {
  getState: () => PollControllerState;
  setState: (patch: Partial<PollControllerState>) => void;
  hasAttachments: () => boolean;
  hasQuotedPost: () => boolean;
}

export class PostComposerPollController {
  constructor(private host: PollControllerHost) {}

  toggle() {
    const state = this.host.getState();

    if (
      !state.pollEnabled &&
      (this.host.hasAttachments() || this.host.hasQuotedPost())
    ) {
      showInfoToast(msg('Remove media attachments before adding a poll.'));
      return;
    }

    const nextPollEnabled = !state.pollEnabled;

    this.host.setState({
      pollEnabled: nextPollEnabled,
      pollError: null,
      ...(nextPollEnabled
        ? {}
        : {
            pollOptions: ['', ''],
            pollDurationSeconds: 60 * 60,
            pollMultiple: false,
          }),
    });
  }

  setOption(index: number, value: string) {
    const { pollOptions } = this.host.getState();
    const next = [...pollOptions];
    next[index] = String(value ?? '');
    this.host.setState({
      pollOptions: next,
      pollError: null,
    });
  }

  addOption() {
    const { pollOptions } = this.host.getState();
    if (pollOptions.length >= 4) return;
    this.host.setState({
      pollOptions: [...pollOptions, ''],
      pollError: null,
    });
  }

  removeOption(index: number) {
    const { pollOptions } = this.host.getState();
    if (pollOptions.length <= 2) return;
    this.host.setState({
      pollOptions: pollOptions.filter((_, i) => i !== index),
      pollError: null,
    });
  }

  setDuration(seconds: number) {
    this.host.setState({ pollDurationSeconds: seconds });
  }

  setMultiple(multiple: boolean) {
    this.host.setState({ pollMultiple: multiple });
  }

  getPayload(): ComposerPollPayload | null {
    const { pollEnabled, pollOptions, pollDurationSeconds, pollMultiple } =
      this.host.getState();

    if (!pollEnabled) return null;

    const options = pollOptions
      .map((o) => String(o ?? '').trim())
      .filter(Boolean);

    if (options.length < 2 || options.length > 4) {
      this.host.setState({ pollError: msg('Add between 2 and 4 options.') });
      return null;
    }

    const normalized = options.map((o) => o.toLowerCase());
    const unique = new Set(normalized);
    if (unique.size !== normalized.length) {
      this.host.setState({ pollError: msg('Poll options must be unique.') });
      return null;
    }

    if (!Number.isFinite(pollDurationSeconds) || pollDurationSeconds <= 0) {
      this.host.setState({ pollError: msg('Choose a valid poll duration.') });
      return null;
    }

    return {
      options,
      expiresIn: pollDurationSeconds,
      multiple: pollMultiple,
    };
  }

  reset() {
    this.host.setState({
      pollEnabled: false,
      pollOptions: ['', ''],
      pollDurationSeconds: 60 * 60,
      pollMultiple: false,
      pollError: null,
    });
  }
}

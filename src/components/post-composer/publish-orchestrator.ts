import { msg, str } from '@lit/localize';

import {
  editPost,
  publishPollPost,
  publishPost,
  replyToPost,
} from '../../services/posts';
import { showInfoToast } from '../../utils/optimistic-updates';
import { perfMark, perfMeasure } from '../../utils/perf-observer';
import MarkdownWorker from '../../utils/markdown-worker?worker';

import { formatScheduledDateTime } from './schedule';
import type {
  ComposerPollPayload,
  ComposerSubmitEvent,
  LocalAttachment,
} from './types';

export interface PublishOrchestratorState {
  autoPublish: boolean;
  attachments: LocalAttachment[];
  visibility: string;
  sensitive: boolean;
  spoilerText: string;
  scheduleEnabled: boolean;
  compact: boolean;
  pollEnabled: boolean;
  replyToId: string | null;
  quotedStatusId: string | null;
  editingPostId: string | null;
  isPublishing: boolean;
  publishSuccess: boolean;
}

interface PublishOrchestratorHost {
  getState: () => PublishOrchestratorState;
  setState: (patch: Partial<PublishOrchestratorState>) => void;
  getStatus: () => string;
  getPollPayload: () => ComposerPollPayload | null;
  resolveScheduledAtForSubmission: () => string | null;
  resetComposer: () => void;
  dispatchSubmit: (detail: ComposerSubmitEvent) => void;
  dispatchPublished: (detail: {
    status: string;
    scheduledAt: string | null;
    edited: boolean;
  }) => void;
}

export class PostComposerPublishOrchestrator {
  private publishSuccessTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private host: PublishOrchestratorHost) {}

  async submit() {
    const state = this.host.getState();
    const status = this.host.getStatus();
    if (!status || status.length === 0) {
      return;
    }

    if (state.attachments.some((attachment) => attachment.pending)) {
      showInfoToast(msg('Waiting for media to finish uploading…'));
      return;
    }

    const scheduledAt = state.compact
      ? null
      : this.host.resolveScheduledAtForSubmission();
    if (!state.compact && state.scheduleEnabled && !scheduledAt) {
      return;
    }

    if (state.autoPublish) {
      this.publish(status, scheduledAt);
      return;
    }

    const pollPayload = this.host.getPollPayload();
    if (state.pollEnabled && !pollPayload) {
      return;
    }

    this.host.dispatchSubmit({
      status,
      attachments: [...state.attachments],
      visibility: state.visibility,
      sensitive: state.sensitive,
      spoilerText: state.sensitive ? state.spoilerText : '',
      poll: pollPayload,
      scheduledAt,
      replyToId: state.replyToId,
      quotedStatusId: state.quotedStatusId,
    });
  }

  destroy() {
    if (this.publishSuccessTimer) {
      clearTimeout(this.publishSuccessTimer);
      this.publishSuccessTimer = null;
    }
  }

  private publish(status: string, submitScheduledAt?: string | null) {
    const state = this.host.getState();
    const scheduledAt =
      submitScheduledAt ??
      (!state.compact && state.scheduleEnabled
        ? this.host.resolveScheduledAtForSubmission()
        : null);

    if (!state.compact && state.scheduleEnabled && !scheduledAt) {
      return;
    }

    if (scheduledAt && !navigator.onLine) {
      showInfoToast(msg('Scheduling requires an internet connection.'));
      return;
    }

    perfMark('post-submit-start');
    this.host.setState({ isPublishing: true });

    const worker = new MarkdownWorker();
    worker.onmessage = () => {
      void this.handleWorkerPublish(worker, status, scheduledAt);
    };
    worker.postMessage(status);
  }

  private async handleWorkerPublish(
    worker: Worker,
    status: string,
    scheduledAt: string | null
  ) {
    const state = this.host.getState();
    const isOffline = !navigator.onLine;

    try {
      const pollPayload = this.host.getPollPayload();

      if (pollPayload && state.attachments.length > 0) {
        showInfoToast(
          msg('Remove media attachments before publishing a poll.')
        );
        this.finishWorker(worker, { isPublishing: false });
        return;
      }

      const spoilerText = state.sensitive ? state.spoilerText : '';

      if (state.editingPostId) {
        await editPost(state.editingPostId, {
          status,
          media_ids: state.attachments.map((attachment) => attachment.id),
          sensitive: state.sensitive,
          spoiler_text: spoilerText,
          visibility: state.visibility,
        });
      } else if (state.replyToId) {
        await replyToPost(
          state.replyToId,
          status,
          state.attachments.length > 0
            ? state.attachments.map((attachment) => attachment.id)
            : undefined,
          state.visibility,
          scheduledAt ?? undefined
        );
      } else if (state.attachments.length > 0) {
        await publishPost(
          status,
          state.attachments.map((attachment) => attachment.id),
          state.sensitive,
          spoilerText,
          state.visibility,
          undefined,
          scheduledAt ?? undefined,
          state.quotedStatusId ?? undefined
        );
      } else if (pollPayload) {
        await publishPollPost(
          status,
          pollPayload,
          state.sensitive,
          spoilerText,
          state.visibility,
          scheduledAt ?? undefined
        );
      } else {
        await publishPost(
          status,
          undefined,
          state.sensitive,
          spoilerText,
          state.visibility,
          undefined,
          scheduledAt ?? undefined,
          state.quotedStatusId ?? undefined
        );
      }
    } catch (error) {
      console.error('[PostComposer] Publish error:', error);

      if (isOffline) {
        if (scheduledAt) {
          showInfoToast(
            msg('Could not schedule while offline. Reconnect and try again.')
          );
          this.finishWorker(worker, { isPublishing: false });
          return;
        }

        showInfoToast(
          msg("Your post will be published when you're back online")
        );
        this.host.resetComposer();
        this.finishWorker(worker, { isPublishing: false });
        return;
      }

      import('../../utils/haptics').then(({ hapticReject }) => hapticReject());
      this.finishWorker(worker, { isPublishing: false });
      return;
    }

    if (scheduledAt) {
      showInfoToast(
        msg(str`Post scheduled for ${formatScheduledDateTime(scheduledAt)}.`)
      );
    }

    perfMark('post-submit-end');
    perfMeasure('Post submit (total)', 'post-submit-start', 'post-submit-end');

    this.finishWorker(worker, { isPublishing: false, publishSuccess: true });

    void import('../../utils/haptics').then(({ hapticConfirm }) =>
      hapticConfirm()
    );

    if (this.publishSuccessTimer) {
      clearTimeout(this.publishSuccessTimer);
    }

    const wasEditing = !!state.editingPostId;
    this.publishSuccessTimer = setTimeout(() => {
      this.host.setState({ publishSuccess: false });
      this.host.resetComposer();
      this.host.dispatchPublished({
        status,
        scheduledAt: scheduledAt ?? null,
        edited: wasEditing,
      });
      this.publishSuccessTimer = null;
    }, 600);
  }

  private finishWorker(
    worker: Worker,
    patch?: Partial<PublishOrchestratorState>
  ) {
    worker.terminate();
    if (patch) {
      this.host.setState(patch);
    }
  }
}

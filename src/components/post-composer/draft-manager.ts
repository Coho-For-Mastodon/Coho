import { msg } from '@lit/localize';

import {
  buildDraftKey,
  listDraftsForContext,
  saveDraftForContext,
  type DraftPost,
} from '../../services/drafts';
import { showInfoToast } from '../../utils/optimistic-updates';

import type { LocalAttachment } from './types';

export interface DraftManagerState {
  statusText: string;
  visibility: string;
  sensitive: boolean;
  spoilerText: string;
  pollEnabled: boolean;
  pollOptions: string[];
  pollDurationSeconds: number;
  pollMultiple: boolean;
  pollError: string | null;
  scheduleEnabled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  scheduleError: string | null;
  attachments: LocalAttachment[];
  draftStatus: 'idle' | 'saving' | 'saved';
  availableDrafts: DraftPost[];
  draftPickerOpen: boolean;
  selectedDraftId: string;
  draftDirty: boolean;
  draftLoaded: boolean;
  draftKey: string | null;
  lastSavedStatusText: string;
  compact: boolean;
  replyToId: string | null;
}

interface DraftManagerHost {
  getState: () => DraftManagerState;
  setState: (patch: Partial<DraftManagerState>) => void;
  syncComposerValue: (value: string) => Promise<void>;
  clearAttachments: () => void;
  restorePendingAttachment: (file: File, description: string | null) => void;
  dispatchDraftSaved: (draftId: string) => void;
}

export class PostComposerDraftManager {
  private draftLoadedTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private host: DraftManagerHost) {}

  hasDraftContent(): boolean {
    const state = this.host.getState();
    return (
      state.statusText.trim().length > 0 ||
      state.attachments.length > 0 ||
      state.pollEnabled ||
      state.scheduleEnabled ||
      state.sensitive ||
      state.spoilerText.trim().length > 0
    );
  }

  async loadDraftForContext() {
    const key = this.getDraftKey();
    this.host.setState({
      draftKey: key,
      availableDrafts: [],
      selectedDraftId: '',
      draftPickerOpen: false,
    });

    if (!key) {
      return;
    }

    await this.refreshDraftList(key);
  }

  async applyDraft(draft: DraftPost) {
    const persistedAttachments: LocalAttachment[] = [];
    const pendingAttachments = draft.attachments?.filter(
      (attachment) => !!attachment.file
    );

    this.host.clearAttachments();

    for (const attachment of draft.attachments ?? []) {
      if (!attachment.file) {
        persistedAttachments.push({
          id: attachment.id,
          preview_url: attachment.preview_url,
          description: attachment.description ?? null,
          pending: attachment.pending,
        });
      }
    }

    this.host.setState({
      visibility: draft.visibility ?? this.host.getState().visibility,
      sensitive: !!draft.sensitive,
      spoilerText: draft.spoilerText ?? '',
      pollEnabled: !!draft.poll,
      pollOptions: draft.poll?.options?.length
        ? [...draft.poll.options]
        : ['', ''],
      pollDurationSeconds: draft.poll?.expiresIn ?? 60 * 60,
      pollMultiple: !!draft.poll?.multiple,
      pollError: null,
      scheduleEnabled: !this.host.getState().compact && !!draft.schedule,
      scheduleDate: !this.host.getState().compact
        ? (draft.schedule?.date ?? '')
        : '',
      scheduleTime: !this.host.getState().compact
        ? (draft.schedule?.time ?? '')
        : '',
      scheduleError: null,
      attachments: persistedAttachments,
    });

    for (const attachment of pendingAttachments ?? []) {
      if (attachment.file instanceof Blob) {
        const file =
          attachment.file instanceof File
            ? attachment.file
            : new File([attachment.file], 'draft-attachment', {
                type: attachment.file.type || 'application/octet-stream',
              });
        this.host.restorePendingAttachment(
          file,
          attachment.description ?? null
        );
      }
    }

    const statusText = draft.status ?? '';
    await this.host.syncComposerValue(statusText);

    this.host.setState({
      draftStatus: 'saved',
      draftDirty: false,
      lastSavedStatusText: statusText,
    });

    await this.pulseLoadedState();
  }

  async refreshDraftList(keyOverride?: string) {
    const state = this.host.getState();
    const activeKey = keyOverride ?? state.draftKey;

    if (!activeKey) {
      this.host.setState({ availableDrafts: [], selectedDraftId: '' });
      return;
    }

    const drafts = await listDraftsForContext(activeKey);
    if (this.host.getState().draftKey !== activeKey) {
      return;
    }

    this.host.setState({
      availableDrafts: drafts,
      selectedDraftId: drafts.some(
        (draft) => draft.id === state.selectedDraftId
      )
        ? state.selectedDraftId
        : (drafts[0]?.id ?? ''),
    });
  }

  async saveDraft() {
    const state = this.host.getState();

    if (!state.draftKey || !this.hasDraftContent()) {
      return;
    }

    this.host.setState({ draftStatus: 'saving' });

    const attachments = state.attachments.map((attachment) => ({
      id: attachment.id,
      preview_url: attachment.preview_url.startsWith('blob:')
        ? ''
        : attachment.preview_url,
      description: attachment.description ?? null,
      pending: attachment.pending,
      file: attachment.pending ? attachment.file : undefined,
    }));

    const savedDraft = await saveDraftForContext(state.draftKey, {
      status: state.statusText,
      visibility: state.visibility,
      sensitive: state.sensitive,
      spoilerText: state.sensitive ? state.spoilerText : '',
      poll: state.pollEnabled
        ? {
            options: [...state.pollOptions],
            expiresIn: state.pollDurationSeconds,
            multiple: state.pollMultiple,
          }
        : null,
      schedule:
        !state.compact && state.scheduleEnabled
          ? {
              date: state.scheduleDate,
              time: state.scheduleTime,
            }
          : null,
      replyToId: state.replyToId,
      attachments,
    });

    await this.refreshDraftList();

    this.host.setState({
      selectedDraftId: savedDraft.id,
      draftStatus: 'saved',
      draftDirty: false,
      lastSavedStatusText: state.statusText,
    });

    this.host.dispatchDraftSaved(savedDraft.id);
  }

  async openDraftPicker() {
    if (!this.host.getState().draftKey) {
      return;
    }

    await this.refreshDraftList();

    const state = this.host.getState();
    if (state.availableDrafts.length === 0) {
      return;
    }

    this.host.setState({
      selectedDraftId: state.selectedDraftId || state.availableDrafts[0].id,
      draftPickerOpen: true,
    });
  }

  closeDraftPicker() {
    this.host.setState({ draftPickerOpen: false });
  }

  handleDraftStatusAnimationEnd() {
    if (this.host.getState().draftStatus === 'saved') {
      this.host.setState({ draftStatus: 'idle' });
    }
  }

  handleDraftSelectionChange(value: string) {
    this.host.setState({ selectedDraftId: value });
  }

  async loadSelectedDraft() {
    const state = this.host.getState();
    const draft = state.availableDrafts.find(
      (entry) => entry.id === state.selectedDraftId
    );

    if (!draft) {
      return;
    }

    await this.applyDraft(draft);
    this.closeDraftPicker();
    this.host.setState({
      draftDirty: false,
      lastSavedStatusText: this.host.getState().statusText,
    });
    showInfoToast(msg('Draft loaded'));
  }

  destroy() {
    if (this.draftLoadedTimer) {
      clearTimeout(this.draftLoadedTimer);
      this.draftLoadedTimer = null;
    }
  }

  private getDraftKey(): string | null {
    const server = localStorage.getItem('server');
    const userId = localStorage.getItem('currentUserID');
    if (!server || !userId) {
      return null;
    }

    return buildDraftKey({
      server,
      userId,
      replyToId: this.host.getState().replyToId,
    });
  }

  private async pulseLoadedState() {
    this.host.setState({ draftLoaded: false });
    await this.host.syncComposerValue(this.host.getState().statusText);
    this.host.setState({ draftLoaded: true });

    if (this.draftLoadedTimer) {
      clearTimeout(this.draftLoadedTimer);
    }

    this.draftLoadedTimer = setTimeout(() => {
      this.host.setState({ draftLoaded: false });
      this.draftLoadedTimer = null;
    }, 650);
  }
}

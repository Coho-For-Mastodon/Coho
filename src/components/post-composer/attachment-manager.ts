import { msg, str } from '@lit/localize';

import { pickMedia, updateMedia, uploadMediaBlob } from '../../services/posts';
import { showErrorToast, showInfoToast } from '../../utils/optimistic-updates';
import { perfMark, perfMeasure } from '../../utils/perf-observer';

import type { LocalAttachment, LocalAttachmentType } from './types';

export interface AttachmentManagerState {
  attachments: LocalAttachment[];
  activeAttachment: LocalAttachment | null;
  activeAttachmentImageSrc: string;
  editDialogOpen: boolean;
  maxMediaAttachments: number;
  imageSizeLimit: number;
  videoSizeLimit: number;
}

interface AttachmentManagerHost {
  getState: () => AttachmentManagerState;
  setState: (patch: Partial<AttachmentManagerState>) => void;
  getMediaEditDialog: () => {
    completeUpload: (success: boolean) => void;
  } | null;
}

export class PostComposerAttachmentManager {
  private activeAttachmentBlobUrl: string | null = null;

  constructor(private host: AttachmentManagerHost) {}

  addAttachment(
    attachment: LocalAttachment,
    options: { pollEnabled: boolean }
  ) {
    const state = this.host.getState();
    if (state.attachments.length >= state.maxMediaAttachments) {
      showInfoToast(
        msg(str`Maximum ${state.maxMediaAttachments} attachments allowed.`)
      );
      return false;
    }

    if (options.pollEnabled) {
      showInfoToast(msg('Disable the poll to attach media.'));
      return false;
    }

    this.host.setState({ attachments: [...state.attachments, attachment] });
    return true;
  }

  async attachFilesFromPicker(options: { pollEnabled: boolean }) {
    const state = this.host.getState();

    if (options.pollEnabled) {
      showInfoToast(msg('Disable the poll to attach media.'));
      return;
    }

    if (state.attachments.length >= state.maxMediaAttachments) {
      showInfoToast(
        msg(str`Maximum ${state.maxMediaAttachments} attachments allowed.`)
      );
      return;
    }

    const files = await pickMedia();
    if (!files || files.length === 0) return;

    for (const file of files) {
      if (
        this.host.getState().attachments.length >= state.maxMediaAttachments
      ) {
        showInfoToast(
          msg(str`Maximum ${state.maxMediaAttachments} attachments allowed.`)
        );
        break;
      }

      this.addFileAttachment(file);
    }
  }

  addFileAttachment(file: File) {
    const state = this.host.getState();
    const mediaType = this.getMediaType(file);
    const sizeLimit =
      mediaType === 'video' ? state.videoSizeLimit : state.imageSizeLimit;

    if (file.size > sizeLimit) {
      import('../../utils/haptics').then(({ hapticReject }) => hapticReject());
      showErrorToast(
        msg(
          str`File exceeds the server limit of ${this.formatBytes(sizeLimit)}.`
        )
      );
      return;
    }

    import('../../utils/haptics').then(({ hapticConfirm }) => hapticConfirm());

    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const previewUrl = URL.createObjectURL(file);
    const newAttachment: LocalAttachment = {
      id: tempId,
      preview_url: previewUrl,
      description: null,
      pending: true,
      file,
      type: mediaType,
    };

    this.host.setState({ attachments: [...state.attachments, newAttachment] });
    void this.uploadFile(file, tempId);
  }

  removeImage(id: string) {
    const state = this.host.getState();
    const attachment = state.attachments.find((entry) => entry.id === id);
    if (attachment?.preview_url.startsWith('blob:')) {
      URL.revokeObjectURL(attachment.preview_url);
    }

    this.host.setState({
      attachments: state.attachments.filter((entry) => entry.id !== id),
    });

    if (state.activeAttachment?.id === id) {
      this.closeEditDialog();
    }
  }

  openEditDialog(attachment: LocalAttachment) {
    this.setActiveAttachment(attachment);
    this.host.setState({ editDialogOpen: true });
  }

  closeEditDialog() {
    this.host.setState({ editDialogOpen: false });
    this.setActiveAttachment(null);
  }

  async handleMediaSave(detail: {
    id: string;
    description: string | null;
    editedBlob?: Blob;
  }) {
    const mediaEditDialog = this.host.getMediaEditDialog();
    const state = this.host.getState();
    const attachment = state.attachments.find(
      (entry) => entry.id === detail.id
    );

    if (!attachment) {
      mediaEditDialog?.completeUpload(false);
      return;
    }

    const blobToUpload =
      detail.editedBlob ?? (attachment.pending ? attachment.file : undefined);

    if (blobToUpload) {
      try {
        const result = await uploadMediaBlob(blobToUpload);
        const fileForLocalEditing =
          blobToUpload instanceof File
            ? blobToUpload
            : new File(
                [blobToUpload],
                attachment.file?.name || `edited-${result.id}.jpg`,
                { type: blobToUpload.type || 'image/jpeg' }
              );

        if (detail.description != null) {
          await updateMedia(result.id, detail.description);
        }

        if (attachment.preview_url.startsWith('blob:')) {
          URL.revokeObjectURL(attachment.preview_url);
        }

        this.host.setState({
          attachments: state.attachments.map((entry) =>
            entry.id === detail.id
              ? {
                  id: result.id,
                  preview_url: result.preview_url,
                  description: detail.description,
                  pending: false,
                  file: fileForLocalEditing,
                  type: result.type,
                }
              : entry
          ),
        });

        if (state.activeAttachment?.id === detail.id) {
          this.setActiveAttachment(null);
        }

        mediaEditDialog?.completeUpload(true);
      } catch (error) {
        console.error('Failed to upload media', error);
        mediaEditDialog?.completeUpload(false);
      }
      return;
    }

    this.host.setState({
      attachments: state.attachments.map((entry) =>
        entry.id === detail.id
          ? { ...entry, description: detail.description }
          : entry
      ),
    });

    if (state.activeAttachment?.id === detail.id) {
      this.setActiveAttachment(null);
    }

    if (!attachment.pending) {
      try {
        if (detail.description != null) {
          await updateMedia(detail.id, detail.description);
        }
        mediaEditDialog?.completeUpload(true);
      } catch (error) {
        console.error('Failed to update media description', error);
        mediaEditDialog?.completeUpload(false);
      }
    } else {
      mediaEditDialog?.completeUpload(true);
    }
  }

  restorePendingAttachment(file: File, description: string | null) {
    const state = this.host.getState();
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const previewUrl = URL.createObjectURL(file);
    const newAttachment: LocalAttachment = {
      id: tempId,
      preview_url: previewUrl,
      description,
      pending: true,
      file,
      type: this.getMediaType(file),
    };

    this.host.setState({ attachments: [...state.attachments, newAttachment] });
    void this.uploadFile(file, tempId);
  }

  clearAttachments() {
    const { attachments } = this.host.getState();
    for (const attachment of attachments) {
      if (attachment.preview_url.startsWith('blob:')) {
        URL.revokeObjectURL(attachment.preview_url);
      }
    }

    this.host.setState({ attachments: [] });
  }

  reset() {
    this.clearAttachments();
    this.closeEditDialog();
  }

  destroy() {
    this.reset();
  }

  private setActiveAttachment(attachment: LocalAttachment | null) {
    if (this.activeAttachmentBlobUrl) {
      URL.revokeObjectURL(this.activeAttachmentBlobUrl);
      this.activeAttachmentBlobUrl = null;
    }

    if (!attachment) {
      this.host.setState({
        activeAttachment: null,
        activeAttachmentImageSrc: '',
      });
      return;
    }

    if (attachment.file) {
      this.activeAttachmentBlobUrl = URL.createObjectURL(attachment.file);
      this.host.setState({
        activeAttachment: attachment,
        activeAttachmentImageSrc: this.activeAttachmentBlobUrl,
      });
      return;
    }

    this.host.setState({
      activeAttachment: attachment,
      activeAttachmentImageSrc: attachment.preview_url,
    });
  }

  private async uploadFile(file: File, tempId: string) {
    perfMark(`media-upload-start:${file.name}`);
    try {
      const result = await uploadMediaBlob(file);
      perfMark(`media-upload-end:${file.name}`);
      perfMeasure(
        `Media upload (${file.name})`,
        `media-upload-start:${file.name}`,
        `media-upload-end:${file.name}`
      );

      const state = this.host.getState();
      const index = state.attachments.findIndex((entry) => entry.id === tempId);
      if (index === -1) return;

      const oldPreview = state.attachments[index].preview_url;
      const isVideo = result.type === 'video' || result.type === 'gifv';
      const updatedAttachment: LocalAttachment = {
        id: result.id,
        preview_url: isVideo ? oldPreview : result.preview_url,
        description: result.description,
        pending: false,
        file,
        type: result.type,
      };

      if (state.activeAttachment?.id === tempId) {
        this.setActiveAttachment(updatedAttachment);
      }

      this.host.setState({
        attachments: state.attachments.map((entry) =>
          entry.id === tempId ? updatedAttachment : entry
        ),
      });

      if (!isVideo && oldPreview.startsWith('blob:')) {
        URL.revokeObjectURL(oldPreview);
      }
    } catch (error) {
      console.error('Failed to upload file:', error);
      const state = this.host.getState();
      const failedAttachment = state.attachments.find(
        (entry) => entry.id === tempId
      );
      if (failedAttachment?.preview_url.startsWith('blob:')) {
        URL.revokeObjectURL(failedAttachment.preview_url);
      }

      this.host.setState({
        attachments: state.attachments.filter((entry) => entry.id !== tempId),
      });
      showInfoToast(msg('Failed to upload media'));
    }
  }

  private getMediaType(file: File): LocalAttachmentType {
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('image/')) return 'image';
    return 'unknown';
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}

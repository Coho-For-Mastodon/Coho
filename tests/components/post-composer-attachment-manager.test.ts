import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const hoisted = vi.hoisted(() => ({
  pickMedia: vi.fn(),
  updateMedia: vi.fn(),
  uploadMediaBlob: vi.fn(),
  showInfoToast: vi.fn(),
  showErrorToast: vi.fn(),
  perfMark: vi.fn(),
  perfMeasure: vi.fn(),
}));

vi.mock('../../src/services/posts', () => ({
  pickMedia: hoisted.pickMedia,
  updateMedia: hoisted.updateMedia,
  uploadMediaBlob: hoisted.uploadMediaBlob,
}));

vi.mock('../../src/utils/optimistic-updates', () => ({
  showInfoToast: hoisted.showInfoToast,
  showErrorToast: hoisted.showErrorToast,
}));

vi.mock('../../src/utils/perf-observer', () => ({
  perfMark: hoisted.perfMark,
  perfMeasure: hoisted.perfMeasure,
}));

import {
  PostComposerAttachmentManager,
  type AttachmentManagerState,
} from '../../src/components/post-composer/attachment-manager';

function createMockFile(
  name: string = 'test.png',
  type: string = 'image/png',
  size: number = 1024
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

function flushPromises() {
  return Promise.resolve().then(() => Promise.resolve());
}

function createState(
  overrides: Partial<AttachmentManagerState> = {}
): AttachmentManagerState {
  return {
    attachments: [],
    activeAttachment: null,
    activeAttachmentImageSrc: '',
    editDialogOpen: false,
    maxMediaAttachments: 4,
    imageSizeLimit: 10 * 1024 * 1024,
    videoSizeLimit: 40 * 1024 * 1024,
    ...overrides,
  };
}

function createHost(initialState: Partial<AttachmentManagerState> = {}) {
  let state = createState(initialState);
  const completeUpload = vi.fn();

  return {
    manager: new PostComposerAttachmentManager({
      getState: () => state,
      setState: (patch) => {
        state = { ...state, ...patch };
      },
      getMediaEditDialog: () => ({ completeUpload }),
    }),
    getState: () => state,
    completeUpload,
  };
}

describe('PostComposerAttachmentManager', () => {
  beforeEach(() => {
    hoisted.pickMedia.mockReset();
    hoisted.updateMedia.mockReset();
    hoisted.uploadMediaBlob.mockReset();
    hoisted.showInfoToast.mockReset();
    hoisted.showErrorToast.mockReset();
    hoisted.perfMark.mockReset();
    hoisted.perfMeasure.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('blocks addAttachment when polls are enabled', () => {
    const host = createHost();

    const added = host.manager.addAttachment(
      {
        id: 'media-1',
        preview_url: 'https://cdn.example.com/media-1.png',
        description: null,
      },
      { pollEnabled: true }
    );

    expect(added).toBe(false);
    expect(host.getState().attachments).toEqual([]);
    expect(hoisted.showInfoToast).toHaveBeenCalled();
  });

  it('rejects oversized files before creating attachments', () => {
    const host = createHost({ imageSizeLimit: 512 });
    const createSpy = vi.spyOn(URL, 'createObjectURL');

    host.manager.addFileAttachment(
      createMockFile('huge.png', 'image/png', 2048)
    );

    expect(host.getState().attachments).toEqual([]);
    expect(hoisted.showErrorToast).toHaveBeenCalled();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('removes failed uploads and revokes the temporary blob URL', async () => {
    const host = createHost();
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:temporary-upload');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    hoisted.uploadMediaBlob.mockRejectedValue(new Error('upload failed'));

    host.manager.addFileAttachment(createMockFile('broken.png', 'image/png'));
    await flushPromises();

    expect(host.getState().attachments).toEqual([]);
    expect(hoisted.showInfoToast).toHaveBeenCalledWith(expect.anything());
    expect(revokeSpy).toHaveBeenCalledWith('blob:temporary-upload');

    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it('opens and closes the edit dialog while revoking blob previews', () => {
    const host = createHost();
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:edit-preview');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const attachment = {
      id: 'media-1',
      preview_url: 'https://cdn.example.com/media-1.png',
      description: null,
      file: createMockFile('edit.png', 'image/png'),
    };

    host.manager.openEditDialog(attachment);

    expect(host.getState().editDialogOpen).toBe(true);
    expect(host.getState().activeAttachment).toEqual(attachment);
    expect(host.getState().activeAttachmentImageSrc).toBe('blob:edit-preview');

    host.manager.closeEditDialog();

    expect(host.getState().editDialogOpen).toBe(false);
    expect(host.getState().activeAttachment).toBeNull();
    expect(host.getState().activeAttachmentImageSrc).toBe('');
    expect(revokeSpy).toHaveBeenCalledWith('blob:edit-preview');

    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it('updates existing media descriptions without reuploading', async () => {
    const retainedFile = createMockFile('retained.png', 'image/png');
    const host = createHost({
      attachments: [
        {
          id: 'media-1',
          preview_url: 'https://cdn.example.com/media-1.png',
          description: null,
          pending: false,
          file: retainedFile,
        },
      ],
    });

    await host.manager.handleMediaSave({
      id: 'media-1',
      description: 'Updated alt text',
    });

    expect(hoisted.uploadMediaBlob).not.toHaveBeenCalled();
    expect(hoisted.updateMedia).toHaveBeenCalledWith(
      'media-1',
      'Updated alt text'
    );
    expect(host.completeUpload).toHaveBeenCalledWith(true);
    expect(host.getState().attachments[0].description).toBe('Updated alt text');
  });

  it('clears existing media descriptions with an empty string', async () => {
    const host = createHost({
      attachments: [
        {
          id: 'media-1',
          preview_url: 'https://cdn.example.com/media-1.png',
          description: 'Old alt text',
          pending: false,
        },
      ],
    });

    await host.manager.handleMediaSave({
      id: 'media-1',
      description: '',
    });

    expect(hoisted.uploadMediaBlob).not.toHaveBeenCalled();
    expect(hoisted.updateMedia).toHaveBeenCalledWith('media-1', '');
    expect(host.completeUpload).toHaveBeenCalledWith(true);
    expect(host.getState().attachments[0].description).toBe('');
  });

  it('uploads edited media and sends blank descriptions', async () => {
    const editedBlob = new Blob(['edited'], { type: 'image/png' });
    const host = createHost({
      attachments: [
        {
          id: 'media-1',
          preview_url: 'https://cdn.example.com/media-1.png',
          description: 'Old alt text',
          pending: false,
        },
      ],
    });

    hoisted.uploadMediaBlob.mockResolvedValue({
      id: 'media-2',
      preview_url: 'https://cdn.example.com/media-2.png',
      description: null,
      type: 'image',
    });

    await host.manager.handleMediaSave({
      id: 'media-1',
      description: '',
      editedBlob,
    });

    expect(hoisted.uploadMediaBlob).toHaveBeenCalledWith(editedBlob);
    expect(hoisted.updateMedia).toHaveBeenCalledWith('media-2', '');
    expect(host.completeUpload).toHaveBeenCalledWith(true);
    expect(host.getState().attachments[0]).toEqual(
      expect.objectContaining({
        id: 'media-2',
        preview_url: 'https://cdn.example.com/media-2.png',
        description: '',
        pending: false,
        type: 'image',
      })
    );
    expect(host.getState().attachments[0].file).toBeInstanceOf(File);
  });

  it('sets media type when restoring pending attachments', () => {
    const host = createHost();
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:restored-video');
    hoisted.uploadMediaBlob.mockImplementation(() => new Promise(() => {}));

    const videoFile = createMockFile('restored.mp4', 'video/mp4');

    host.manager.restorePendingAttachment(videoFile, 'Video alt text');

    expect(host.getState().attachments[0]).toEqual(
      expect.objectContaining({
        preview_url: 'blob:restored-video',
        description: 'Video alt text',
        pending: true,
        file: videoFile,
        type: 'video',
      })
    );

    createSpy.mockRestore();
  });

  it('keeps local blob previews for gifv upload results', async () => {
    const host = createHost();
    const createSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:animated-gif');
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

    hoisted.uploadMediaBlob.mockResolvedValue({
      id: 'media-gifv',
      preview_url: 'https://cdn.example.com/media-gifv.png',
      description: null,
      type: 'gifv',
    });

    host.manager.addFileAttachment(createMockFile('animated.gif', 'image/gif'));
    await flushPromises();

    expect(host.getState().attachments[0]).toEqual(
      expect.objectContaining({
        id: 'media-gifv',
        preview_url: 'blob:animated-gif',
        pending: false,
        type: 'gifv',
      })
    );
    expect(revokeSpy).not.toHaveBeenCalledWith('blob:animated-gif');

    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });
});

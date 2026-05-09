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
    const host = createHost({
      attachments: [
        {
          id: 'media-1',
          preview_url: 'https://cdn.example.com/media-1.png',
          description: null,
          pending: false,
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
});

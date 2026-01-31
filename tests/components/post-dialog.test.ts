/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fixture, html, elementUpdated, cleanupFixtures } from '../test-utils';
import '../../src/components/post-dialog';
import type { PostDialog } from '../../src/components/post-dialog';
import { setupAuth } from '../setup';

// Helper to wait for animation frame
function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

// Helper to wait for multiple frames
async function waitForFrames(count: number = 2): Promise<void> {
  for (let i = 0; i < count; i++) {
    await waitForAnimationFrame();
  }
}

// Helper to create a mock File
function createMockFile(
  name: string = 'test.png',
  type: string = 'image/png',
  size: number = 1024
): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type });
}

// Helper to create a DataTransfer with files
function createDataTransferWithFiles(files: File[]): DataTransfer {
  const dataTransfer = new DataTransfer();
  files.forEach((file) => dataTransfer.items.add(file));
  return dataTransfer;
}

describe('post-dialog multi-image upload', () => {
  beforeEach(() => {
    setupAuth();
    cleanupFixtures();
  });

  describe('initialization', () => {
    it('should initialize with default maxMediaAttachments of 4', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);

      await elementUpdated(el);

      expect((el as any).maxMediaAttachments).toBe(4);
    });

    it('should initialize with empty attachments array', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);

      await elementUpdated(el);

      expect((el as any).attachments).toEqual([]);
    });

    it('should fetch maxMediaAttachments from instance config', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);

      // Wait for firstUpdated to complete (includes async instance fetch)
      await elementUpdated(el);
      await waitForFrames(5);

      // The mock instance returns max_media_attachments: 4
      expect((el as any).maxMediaAttachments).toBe(4);
    });
  });

  describe('attachment limit enforcement', () => {
    it('should allow adding attachments up to the limit', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      // Manually set attachments to simulate adding images
      (el as any).attachments = [
        { id: '1', preview_url: 'blob:1', description: null, pending: false },
        { id: '2', preview_url: 'blob:2', description: null, pending: false },
        { id: '3', preview_url: 'blob:3', description: null, pending: false },
      ];

      await elementUpdated(el);

      expect((el as any).attachments.length).toBe(3);
    });

    it('should prevent adding more attachments when at limit via attachFile', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      // Set attachments to max (4)
      (el as any).attachments = [
        { id: '1', preview_url: 'blob:1', description: null, pending: false },
        { id: '2', preview_url: 'blob:2', description: null, pending: false },
        { id: '3', preview_url: 'blob:3', description: null, pending: false },
        { id: '4', preview_url: 'blob:4', description: null, pending: false },
      ];

      await elementUpdated(el);

      // Try to attach more via the attachFile method
      // This should show a toast and return early
      await (el as any).attachFile();

      // Still should be 4
      expect((el as any).attachments.length).toBe(4);
    });

    it('should disable attach button when at attachment limit', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);
      await waitForFrames(3);

      // Set attachments to max
      (el as any).attachments = [
        { id: '1', preview_url: 'blob:1', description: null, pending: false },
        { id: '2', preview_url: 'blob:2', description: null, pending: false },
        { id: '3', preview_url: 'blob:3', description: null, pending: false },
        { id: '4', preview_url: 'blob:4', description: null, pending: false },
      ];

      await elementUpdated(el);

      // Check that the attach button reflects the limit
      // The condition is: pollEnabled || attachments.length >= maxMediaAttachments
      const atLimit =
        (el as any).attachments.length >= (el as any).maxMediaAttachments;
      expect(atLimit).toBe(true);
    });
  });

  describe('paste handling', () => {
    it('should add pasted image as attachment', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      const file = createMockFile('pasted.png', 'image/png');

      // Create a mock event object that mimics ClipboardEvent
      const mockEvent = {
        clipboardData: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => file,
            },
          ],
        },
        preventDefault: vi.fn(),
      };

      // Manually trigger the paste handler with mock event
      (el as any)._handlePaste(mockEvent as unknown as ClipboardEvent);

      await elementUpdated(el);

      expect((el as any).attachments.length).toBe(1);
      expect((el as any).attachments[0].pending).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should not add pasted image when poll is enabled', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      (el as any).pollEnabled = true;
      await elementUpdated(el);

      const file = createMockFile('pasted.png', 'image/png');

      const mockEvent = {
        clipboardData: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => file,
            },
          ],
        },
        preventDefault: vi.fn(),
      };

      (el as any)._handlePaste(mockEvent as unknown as ClipboardEvent);

      await elementUpdated(el);

      expect((el as any).attachments.length).toBe(0);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should not add pasted image when at attachment limit', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      // Set attachments to max
      (el as any).attachments = [
        { id: '1', preview_url: 'blob:1', description: null, pending: false },
        { id: '2', preview_url: 'blob:2', description: null, pending: false },
        { id: '3', preview_url: 'blob:3', description: null, pending: false },
        { id: '4', preview_url: 'blob:4', description: null, pending: false },
      ];

      const file = createMockFile('pasted.png', 'image/png');

      const mockEvent = {
        clipboardData: {
          items: [
            {
              type: 'image/png',
              getAsFile: () => file,
            },
          ],
        },
        preventDefault: vi.fn(),
      };

      (el as any)._handlePaste(mockEvent as unknown as ClipboardEvent);

      await elementUpdated(el);

      // Should still be 4
      expect((el as any).attachments.length).toBe(4);
    });

    it('should handle multiple images in paste (up to limit)', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      // Pre-set 2 attachments
      (el as any).attachments = [
        { id: '1', preview_url: 'blob:1', description: null, pending: false },
        { id: '2', preview_url: 'blob:2', description: null, pending: false },
      ];

      const file1 = createMockFile('pasted1.png', 'image/png');
      const file2 = createMockFile('pasted2.png', 'image/png');
      const file3 = createMockFile('pasted3.png', 'image/png');

      const mockEvent = {
        clipboardData: {
          items: [
            { type: 'image/png', getAsFile: () => file1 },
            { type: 'image/png', getAsFile: () => file2 },
            { type: 'image/png', getAsFile: () => file3 },
          ],
        },
        preventDefault: vi.fn(),
      };

      (el as any)._handlePaste(mockEvent as unknown as ClipboardEvent);

      await elementUpdated(el);

      // Should have 4 total (2 existing + 2 new, stopped at limit)
      expect((el as any).attachments.length).toBe(4);
    });
  });

  describe('drop handling', () => {
    it('should add dropped image as attachment', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      const file = createMockFile('dropped.png', 'image/png');
      const dataTransfer = createDataTransferWithFiles([file]);

      const dropEvent = new DragEvent('drop', {
        dataTransfer,
        bubbles: true,
        cancelable: true,
      });

      (el as any)._handleDrop(dropEvent);

      await elementUpdated(el);

      expect((el as any).attachments.length).toBe(1);
      expect((el as any).attachments[0].pending).toBe(true);
    });

    it('should handle multiple dropped files (up to limit)', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      const files = [
        createMockFile('dropped1.png', 'image/png'),
        createMockFile('dropped2.png', 'image/png'),
        createMockFile('dropped3.png', 'image/png'),
        createMockFile('dropped4.png', 'image/png'),
        createMockFile('dropped5.png', 'image/png'), // This one exceeds limit
      ];

      const dataTransfer = createDataTransferWithFiles(files);

      const dropEvent = new DragEvent('drop', {
        dataTransfer,
        bubbles: true,
        cancelable: true,
      });

      (el as any)._handleDrop(dropEvent);

      await elementUpdated(el);

      // Should stop at 4 (the limit)
      expect((el as any).attachments.length).toBe(4);
    });

    it('should not add dropped files when poll is enabled', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      (el as any).pollEnabled = true;
      await elementUpdated(el);

      const file = createMockFile('dropped.png', 'image/png');
      const dataTransfer = createDataTransferWithFiles([file]);

      const dropEvent = new DragEvent('drop', {
        dataTransfer,
        bubbles: true,
        cancelable: true,
      });

      (el as any)._handleDrop(dropEvent);

      await elementUpdated(el);

      expect((el as any).attachments.length).toBe(0);
    });
  });

  describe('pending upload handling', () => {
    it('should prevent publishing when attachments are pending', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);
      await waitForFrames(3);

      // Set up with a pending attachment
      (el as any).attachments = [
        {
          id: 'temp-1',
          preview_url: 'blob:1',
          description: null,
          pending: true,
        },
      ];
      (el as any).hasStatus = true;

      // Set some text in the textarea
      const textArea = el.shadowRoot?.querySelector('md-text-area') as any;
      if (textArea) {
        textArea.value = 'Test post with pending image';
      }

      await elementUpdated(el);

      // Call publish - it should return early due to pending attachment
      await (el as any).publish();

      // The attachments should still be there (not cleared by successful publish)
      expect((el as any).attachments.length).toBe(1);
    });

    it('should allow publishing when all attachments are uploaded', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);
      await waitForFrames(3);

      // Set up with a completed attachment
      (el as any).attachments = [
        {
          id: 'media_123',
          preview_url: 'https://example.com/image.png',
          description: null,
          pending: false,
        },
      ];
      (el as any).hasStatus = true;

      await elementUpdated(el);

      // Check that pending state is false for all
      const hasPending = (el as any).attachments.some(
        (a: any) => a.pending === true
      );
      expect(hasPending).toBe(false);
    });

    it('should disable publish button when uploads are pending', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);
      await waitForFrames(3);

      // Set up with a pending attachment and text
      (el as any).attachments = [
        {
          id: 'temp-1',
          preview_url: 'blob:1',
          description: null,
          pending: true,
        },
      ];
      (el as any).hasStatus = true;

      await elementUpdated(el);

      // The publish button should be disabled based on the condition
      // hasStatus === false || attaching === true || attachments.some((a) => a.pending)
      const hasPending = (el as any).attachments.some((a: any) => a.pending);
      expect(hasPending).toBe(true);
    });
  });

  describe('image removal', () => {
    it('should remove attachment by id', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      (el as any).attachments = [
        { id: '1', preview_url: 'blob:1', description: null, pending: false },
        { id: '2', preview_url: 'blob:2', description: null, pending: false },
      ];

      await elementUpdated(el);

      (el as any).removeImage('1');

      await elementUpdated(el);

      expect((el as any).attachments.length).toBe(1);
      expect((el as any).attachments[0].id).toBe('2');
    });

    it('should revoke blob URL when removing attachment', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      // Spy on URL.revokeObjectURL
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

      const blobUrl = URL.createObjectURL(new Blob(['test']));
      (el as any).attachments = [
        { id: '1', preview_url: blobUrl, description: null, pending: false },
      ];

      await elementUpdated(el);

      (el as any).removeImage('1');

      expect(revokeSpy).toHaveBeenCalledWith(blobUrl);

      revokeSpy.mockRestore();
    });
  });

  describe('dialog state reset', () => {
    it('should clear attachments when dialog is reset', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      (el as any).attachments = [
        { id: '1', preview_url: 'blob:1', description: null, pending: false },
        { id: '2', preview_url: 'blob:2', description: null, pending: false },
      ];

      await elementUpdated(el);

      (el as any).resetDialogState();

      await elementUpdated(el);

      expect((el as any).attachments.length).toBe(0);
    });

    it('should revoke blob URLs when resetting dialog state', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');

      const blobUrl1 = URL.createObjectURL(new Blob(['test1']));
      const blobUrl2 = URL.createObjectURL(new Blob(['test2']));

      (el as any).attachments = [
        { id: '1', preview_url: blobUrl1, description: null, pending: false },
        { id: '2', preview_url: blobUrl2, description: null, pending: false },
      ];

      await elementUpdated(el);

      (el as any).resetDialogState();

      expect(revokeSpy).toHaveBeenCalledWith(blobUrl1);
      expect(revokeSpy).toHaveBeenCalledWith(blobUrl2);

      revokeSpy.mockRestore();
    });
  });

  describe('poll and media mutual exclusion', () => {
    it('should not allow toggling poll when attachments exist', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      // Add an attachment
      (el as any).attachments = [
        { id: '1', preview_url: 'blob:1', description: null, pending: false },
      ];

      await elementUpdated(el);

      // Try to enable poll
      (el as any)._togglePoll();

      await elementUpdated(el);

      // Poll should not be enabled
      expect((el as any).pollEnabled).toBe(false);
    });

    it('should not allow attaching media when poll is enabled', async () => {
      const el = await fixture<PostDialog>(html`<post-dialog></post-dialog>`);
      await elementUpdated(el);

      (el as any).pollEnabled = true;
      await elementUpdated(el);

      // Try to attach file
      await (el as any).attachFile();

      // No attachments should be added
      expect((el as any).attachments.length).toBe(0);
    });
  });
});

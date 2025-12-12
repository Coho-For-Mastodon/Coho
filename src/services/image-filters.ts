/**
 * Image filter presets and utilities
 * Uses Web Worker for off-main-thread processing
 */

import FilterWorker from './image-filter-worker?worker';
import type {
  FilterWorkerMessage,
  FilterWorkerResponse,
} from './image-filter-worker';

export interface FilterPreset {
  name: string;
  brightness: number; // -100 to 100
  contrast: number; // -100 to 100
  saturation: number; // -100 to 100
}

export const FILTER_PRESETS: Record<string, FilterPreset> = {
  none: { name: 'Original', brightness: 0, contrast: 0, saturation: 0 },
  vibrant: { name: 'Vibrant', brightness: 5, contrast: 15, saturation: 30 },
  cool: { name: 'Cool', brightness: 0, contrast: 5, saturation: -15 },
  warm: { name: 'Warm', brightness: 10, contrast: 5, saturation: 15 },
  bw: { name: 'B&W', brightness: 0, contrast: 20, saturation: -100 },
  soft: { name: 'Soft', brightness: 10, contrast: -10, saturation: 5 },
  dramatic: { name: 'Dramatic', brightness: -5, contrast: 40, saturation: 10 },
};

// Singleton worker instance
let worker: Worker | null = null;
let requestId = 0;
const pendingRequests = new Map<
  string,
  { resolve: (data: ImageData) => void; reject: (error: Error) => void }
>();

function getWorker(): Worker {
  if (!worker) {
    worker = new FilterWorker();
    worker.onmessage = (e: MessageEvent<FilterWorkerResponse>) => {
      const { id, imageData, success, error } = e.data;
      const pending = pendingRequests.get(id);
      if (pending) {
        pendingRequests.delete(id);
        if (success) {
          pending.resolve(imageData);
        } else {
          pending.reject(new Error(error || 'Filter processing failed'));
        }
      }
    };
    worker.onerror = (e) => {
      console.error('Filter worker error:', e);
      // Reject all pending requests
      for (const [id, pending] of pendingRequests) {
        pending.reject(new Error('Worker error'));
        pendingRequests.delete(id);
      }
    };
  }
  return worker;
}

async function processInWorker(
  imageData: ImageData,
  filter: FilterPreset,
  type: 'apply' | 'thumbnail'
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const id = `${type}-${++requestId}`;
    pendingRequests.set(id, { resolve, reject });

    const message: FilterWorkerMessage = {
      type,
      id,
      imageData,
      filter,
    };

    // Transfer the buffer to the worker
    getWorker().postMessage(message, [imageData.data.buffer]);
  });
}

/**
 * Load an image from URL and return canvas context with image drawn
 */
async function loadImageToCanvas(
  imageUrl: string,
  maxWidth?: number,
  maxHeight?: number
): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = imageUrl;
  });

  let width = img.naturalWidth;
  let height = img.naturalHeight;

  // Scale down if max dimensions provided
  if (maxWidth && maxHeight) {
    const scale = Math.min(maxWidth / width, maxHeight / height, 1);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  ctx.drawImage(img, 0, 0, width, height);

  return { canvas, ctx };
}

/**
 * Apply a filter preset to an image and return a blob
 */
export async function applyFilter(
  imageUrl: string,
  filter: FilterPreset
): Promise<{ blob: Blob; dataUrl: string }> {
  const { canvas, ctx } = await loadImageToCanvas(imageUrl);

  // If no filter (original), just return the image as-is
  if (
    filter.brightness === 0 &&
    filter.contrast === 0 &&
    filter.saturation === 0
  ) {
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
        'image/jpeg',
        0.92
      );
    });
    return { blob, dataUrl };
  }

  // Get image data and process in worker
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processedData = await processInWorker(imageData, filter, 'apply');

  // Put processed data back on canvas
  ctx.putImageData(processedData, 0, 0);

  // Convert to blob and data URL
  const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Failed to create blob'))),
      'image/jpeg',
      0.92
    );
  });

  return { blob, dataUrl };
}

/**
 * Generate a small thumbnail preview of a filter
 */
export async function generateFilterThumbnail(
  imageUrl: string,
  filter: FilterPreset,
  maxSize = 100
): Promise<string> {
  const { canvas, ctx } = await loadImageToCanvas(imageUrl, maxSize, maxSize);

  // If no filter, return as-is
  if (
    filter.brightness === 0 &&
    filter.contrast === 0 &&
    filter.saturation === 0
  ) {
    return canvas.toDataURL('image/jpeg', 0.7);
  }

  // Get image data and process in worker
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const processedData = await processInWorker(imageData, filter, 'thumbnail');

  // Put processed data back on canvas
  ctx.putImageData(processedData, 0, 0);

  return canvas.toDataURL('image/jpeg', 0.7);
}

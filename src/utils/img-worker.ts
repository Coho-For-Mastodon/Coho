import { decodeBlurHash } from 'fast-blurhash';

const canvas = new OffscreenCanvas(1, 1);
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('Failed to get 2d context from OffscreenCanvas');
}

self.onmessage = async (e) => {
  const { id, hash, width, height } = e.data;

  try {
    canvas.width = width;
    canvas.height = height;

    const pixels = decodeBlurHash(hash, width, height);
    if (!pixels) {
      self.postMessage({ id, blob: null });
      return;
    }

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    const blob = await canvas.convertToBlob();
    self.postMessage({ id, blob });
  } catch (error) {
    console.error('Blurhash worker error:', error);
    self.postMessage({ id, blob: null });
  }
};

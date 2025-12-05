import { decodeBlurHash } from 'fast-blurhash';

console.log('🚀 Worker script loaded at', Date.now());

const canvas = new OffscreenCanvas(1, 1);
const ctx = canvas.getContext('2d');

if (!ctx) {
  throw new Error('Failed to get 2d context from OffscreenCanvas');
}

self.onmessage = (e) => {
  const workerReceiveTime = Date.now();
  const { id, hash, width, height, sendTime } = e.data;

  console.log(
    'Worker received, delay from send:',
    sendTime ? workerReceiveTime - sendTime + 'ms' : 'unknown'
  );

  try {
    const decodeStart = Date.now();
    canvas.width = width;
    canvas.height = height;

    const pixels = decodeBlurHash(hash, width, height);
    const decodeEnd = Date.now();

    console.log('Worker: Decode took', decodeEnd - decodeStart, 'ms for', id);

    if (!pixels) {
      console.error('Worker: Failed to decode blurhash');
      self.postMessage({ id, bitmap: null });
      return;
    }

    const imageData = ctx.createImageData(width, height);
    imageData.data.set(pixels);
    ctx.putImageData(imageData, 0, 0);

    const bitmap = canvas.transferToImageBitmap();

    console.log('Worker: Sending bitmap for', id);
    self.postMessage({ id, bitmap }, { transfer: [bitmap] });
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ id, bitmap: null });
  }
};

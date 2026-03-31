import ImgWorker from '../utils/img-worker?worker';

type BlurhashCallback = (id: string, objectUrl: string) => void;

class BlurhashWorkerManager {
  private static instance: BlurhashWorkerManager;
  private worker: Worker | null = null;
  private callbacks: Map<string, BlurhashCallback> = new Map();

  private constructor() {
    this.initWorker();
  }

  static getInstance(): BlurhashWorkerManager {
    if (!BlurhashWorkerManager.instance) {
      BlurhashWorkerManager.instance = new BlurhashWorkerManager();
    }
    return BlurhashWorkerManager.instance;
  }

  private initWorker() {
    if (this.worker) return;

    this.worker = new ImgWorker();

    this.worker.onmessage = (e) => {
      const { id, blob } = e.data;

      if (!blob) return;

      const objectUrl = URL.createObjectURL(blob);

      const callback = this.callbacks.get(id);
      if (callback) {
        callback(id, objectUrl);
        this.callbacks.delete(id);
      } else {
        // Callback was cancelled before the worker finished — clean up immediately
        URL.revokeObjectURL(objectUrl);
      }
    };

    this.worker.onerror = (error) => {
      console.error('Blurhash worker error:', error);
    };
  }

  generateBlurhash(
    id: string,
    hash: string,
    width: number,
    height: number,
    callback: BlurhashCallback
  ) {
    if (!this.worker) return;

    this.callbacks.set(id, callback);

    this.worker.postMessage({ id, hash, width, height });
  }

  /** Remove a pending callback so the result is discarded when it arrives. */
  cancel(id: string) {
    this.callbacks.delete(id);
  }

  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.callbacks.clear();
    }
  }
}

export const getBlurhashWorker = () => BlurhashWorkerManager.getInstance();

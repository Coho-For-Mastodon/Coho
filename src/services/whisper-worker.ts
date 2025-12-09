/**
 * Web Worker for running Whisper speech-to-text via transformers.js
 * This runs off the main thread to avoid blocking the UI
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let whisperPipeline: any = null;

/**
 * Check if WebGPU is actually available and working
 */
async function checkWebGPU(): Promise<boolean> {
  if (!('gpu' in navigator)) {
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gpu = (navigator as any).gpu;
    const adapter = await gpu.requestAdapter();
    if (adapter) {
      const device = await adapter.requestDevice();
      if (device) {
        device.destroy();
        return true;
      }
    }
  } catch {
    console.log('[Whisper Worker] WebGPU not available');
  }

  return false;
}

/**
 * Initialize the Whisper pipeline
 */
async function initializePipeline(): Promise<void> {
  if (whisperPipeline) return;

  const { pipeline } = await import('@huggingface/transformers');

  const canUseWebGPU = await checkWebGPU();
  const device = canUseWebGPU ? 'webgpu' : 'wasm';

  console.log(
    `[Whisper Worker] Creating pipeline on ${device.toUpperCase()}...`
  );

  try {
    whisperPipeline = await pipeline(
      'automatic-speech-recognition',
      'onnx-community/whisper-tiny.en',
      {
        dtype: device === 'webgpu' ? 'fp32' : 'q8',
        device,
      }
    );
    console.log(
      `[Whisper Worker] Pipeline created successfully on ${device.toUpperCase()}`
    );
  } catch (gpuError) {
    if (device === 'webgpu') {
      console.warn(
        '[Whisper Worker] WebGPU failed, falling back to WASM:',
        gpuError
      );
      whisperPipeline = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        {
          dtype: 'q8',
          device: 'wasm',
        }
      );
      console.log('[Whisper Worker] Pipeline created on WASM (CPU)');
    } else {
      throw gpuError;
    }
  }
}

/**
 * Transcribe pre-processed audio data (Float32Array at 16kHz)
 * Audio conversion happens on main thread since AudioContext isn't available in workers
 */
async function transcribe(audioData: Float32Array): Promise<string | null> {
  await initializePipeline();

  console.log('[Whisper Worker] Transcribing...');
  const result = await whisperPipeline(audioData, {
    return_timestamps: false,
  });

  console.log('[Whisper Worker] Result:', result);

  if (!result) {
    return null;
  }
  if (typeof result === 'string') {
    return result.trim();
  }
  if (typeof result === 'object' && 'text' in result) {
    return String(result.text).trim();
  }

  return null;
}

// Handle messages from the main thread
self.onmessage = async (event: MessageEvent) => {
  const { type, id, audioData } = event.data;

  if (type === 'transcribe') {
    try {
      const text = await transcribe(audioData);
      self.postMessage({ type: 'result', id, text });
    } catch (error) {
      console.error('[Whisper Worker] Error:', error);
      self.postMessage({
        type: 'error',
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
};

// Signal that the worker is ready
self.postMessage({ type: 'ready' });

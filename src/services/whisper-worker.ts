import { pipeline, env } from '@huggingface/transformers';

// Skip local model checks
env.allowLocalModels = false;

// Use the Singleton pattern to enable lazy construction of the pipeline.
const PipelineFactory = {
  task: 'automatic-speech-recognition',
  model: 'Xenova/whisper-tiny.en',
  instance: null as Promise<unknown> | null,
  isInitialized: false,
  async getInstance(
    progress_callback: ((data: unknown) => void) | undefined = undefined
  ) {
    if (this.instance === null) {
      this.instance = (async () => {
        try {
          return await pipeline('automatic-speech-recognition', this.model, {
            progress_callback,
            device: 'webgpu',
          });
        } catch (webGpuError) {
          console.warn(
            'Whisper webgpu init failed, falling back to default backend:',
            webGpuError
          );
          return pipeline('automatic-speech-recognition', this.model, {
            progress_callback,
          });
        }
      })();
    }

    try {
      const instance = await this.instance;
      this.isInitialized = true;
      return instance;
    } catch (error) {
      // Allow retries after initialization failures
      this.instance = null;
      this.isInitialized = false;
      throw error;
    }
  },
};

self.addEventListener('message', async (event) => {
  const { type, id, audioData } = event.data;

  if (type === 'init') {
    try {
      await PipelineFactory.getInstance((_data: unknown) => {
        // Optional: emit download/progress updates in the future
      });

      self.postMessage({
        type: 'initialized',
        id,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (type === 'transcribe') {
    try {
      const transcriber = (await PipelineFactory.getInstance(
        (_data: unknown) => {
          // You can send progress back if needed
        }
      )) as (audio: unknown, options: unknown) => Promise<{ text: string }>;

      const output = await transcriber(audioData, {
        // Greedy
        top_k: 0,
        do_sample: false,

        // Sliding window
        chunk_length_s: 30,
        stride_length_s: 5,

        // Return timestamps
        return_timestamps: true,
      });

      self.postMessage({
        type: 'result',
        id,
        text: output.text,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
});

self.postMessage({ type: 'ready' });

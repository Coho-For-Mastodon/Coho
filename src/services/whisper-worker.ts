import { pipeline, env } from '@huggingface/transformers';

// Skip local model checks
env.allowLocalModels = false;

// Use the Singleton pattern to enable lazy construction of the pipeline.
const PipelineFactory = {
  task: 'automatic-speech-recognition',
  model: 'Xenova/whisper-tiny.en',
  instance: null as Promise<unknown> | null,

  async getInstance(
    progress_callback: ((data: unknown) => void) | undefined = undefined
  ) {
    if (this.instance === null) {
      this.instance = pipeline('automatic-speech-recognition', this.model, {
        device: 'webgpu',
        progress_callback,
      });
    }

    return this.instance;
  },
};

self.addEventListener('message', async (event) => {
  const { type, id, audioData } = event.data;

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

/**
 * Web Worker for running Whisper speech-to-text via transformers.js
 * This runs off the main thread to avoid blocking the UI
 */
declare let whisperPipeline: any;
/**
 * Check if WebGPU is actually available and working
 */
declare function checkWebGPU(): Promise<boolean>;
/**
 * Initialize the Whisper pipeline
 */
declare function initializePipeline(): Promise<void>;
/**
 * Transcribe pre-processed audio data (Float32Array at 16kHz)
 * Audio conversion happens on main thread since AudioContext isn't available in workers
 */
declare function transcribe(audioData: Float32Array): Promise<string | null>;

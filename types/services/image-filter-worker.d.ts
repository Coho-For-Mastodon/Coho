/**
 * Web Worker for image filter processing
 * Runs filter operations off the main thread for better performance
 */
export interface FilterPreset {
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
}
export interface FilterWorkerMessage {
  type: 'apply' | 'thumbnail';
  id: string;
  imageData: ImageData;
  filter: FilterPreset;
  outputWidth?: number;
  outputHeight?: number;
}
export interface FilterWorkerResponse {
  type: 'apply' | 'thumbnail';
  id: string;
  imageData: ImageData;
  success: boolean;
  error?: string;
}

/**
 * Image filter presets and utilities
 * Uses Web Worker for off-main-thread processing
 */
export interface FilterPreset {
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
}
export declare const FILTER_PRESETS: Record<string, FilterPreset>;
/**
 * Apply a filter preset to an image and return a blob
 */
export declare function applyFilter(
  imageUrl: string,
  filter: FilterPreset
): Promise<{
  blob: Blob;
  dataUrl: string;
}>;
/**
 * Generate a small thumbnail preview of a filter
 */
export declare function generateFilterThumbnail(
  imageUrl: string,
  filter: FilterPreset,
  maxSize?: number
): Promise<string>;

import { MediaAttachment } from '../types';
export declare function uploadImageFromURL(url: string): Promise<MediaAttachment>;
export declare function uploadImageFromBlob(blob: Blob): Promise<MediaAttachment>;
export declare function uploadMediaFile(file: File): Promise<MediaAttachment>;
export declare function updateMedia(id: string, description: string): Promise<MediaAttachment>;

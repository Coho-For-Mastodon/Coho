import { Account } from '../types/interfaces/Account';
import { Post } from '../interfaces/Post';
import { MediaAttachment } from '../types/interfaces/MediaAttachment';
export declare function whoBoostedAndFavorited(id: string): Promise<Account[]>;
export declare function editPost(id: string, newContent: string): Promise<Post>;
export declare function deletePost(id: string): Promise<Post>;
export declare function getPostDetail(id: string): Promise<Post>;
export declare function publishPost(
  post: string,
  ids?: Array<string>,
  sensitive?: boolean,
  spoilerText?: string,
  visibility?: string,
  poll?: {
    options: string[];
    expiresIn: number;
    multiple: boolean;
  }
): Promise<Post>;
export declare function publishPollPost(
  post: string,
  poll: {
    options: string[];
    expiresIn: number;
    multiple: boolean;
  },
  sensitive?: boolean,
  spoilerText?: string,
  visibility?: string
): Promise<Post>;
export declare function replyToPost(id: string, content: string): Promise<Post>;
export declare function uploadImageFromURL(
  url: string
): Promise<MediaAttachment>;
export declare function uploadImageFromBlob(
  blob: Blob
): Promise<MediaAttachment>;
export declare function pickMedia(): Promise<File[]>;
export declare function uploadMediaFile(file: File): Promise<MediaAttachment>;
export declare function uploadImageAsFormData(): Promise<MediaAttachment[]>;
export declare function updateMedia(
  id: string,
  description: string
): Promise<MediaAttachment>;

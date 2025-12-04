import { Post } from '../types';
export declare const getBookmarks: () => Promise<Post[]>;
export declare const addBookmark: (id: string) => Promise<any>;

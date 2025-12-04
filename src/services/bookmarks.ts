import { Post } from '../interfaces/Post';
import {
  getBookmarks as mastodonGetBookmarks,
  addBookmark as mastodonAddBookmark,
} from '../mastodon';

export const getBookmarks = async (): Promise<Post[]> => {
  const data = await mastodonGetBookmarks();
  return data as unknown as Post[];
};

export const addBookmark = mastodonAddBookmark;

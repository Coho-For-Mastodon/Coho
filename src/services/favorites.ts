import { Post } from '../interfaces/Post';
import { getFavorites as mastodonGetFavorites } from '../mastodon';

export const getFavorites = async (): Promise<Post[]> => {
  const data = await mastodonGetFavorites();
  return data as unknown as Post[];
};

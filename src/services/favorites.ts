import { Post } from '../interfaces/Post';
import { getFavorites as mastodonGetFavorites } from '../mastodon/api/favorites';

export const getFavorites = async (): Promise<Post[]> => {
  const data = await mastodonGetFavorites();
  return data as unknown as Post[];
};

import type { Account } from '../mastodon/types/account';
import type { Post } from './Post';

export interface Notification {
  id: string;
  type: string;
  created_at: string;
  account: Account;
  status?: Post;
}

import { Account } from '../types/interfaces/Account';
import { Post } from './Post';
export interface Notification {
    id: string;
    type: string;
    created_at: string;
    account: Account;
    status?: Post;
}

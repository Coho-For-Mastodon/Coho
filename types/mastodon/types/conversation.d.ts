/**
 * Mastodon Conversation Types
 * @see https://docs.joinmastodon.org/entities/Conversation/
 */
import { Account } from './account';
import { Status } from './status';
export interface Conversation {
    id: string;
    unread: boolean;
    accounts: Account[];
    last_status: Status | null;
}

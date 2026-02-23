/**
 * Mastodon Notification Types
 * @see https://docs.joinmastodon.org/entities/Notification/
 */

import { Account } from './account';
import { Status } from './status';

export interface Notification {
  id: string;
  type: NotificationType;
  created_at: string;
  account: Account;
  status?: Status;
}

export type NotificationType =
  | 'follow'
  | 'follow_request'
  | 'mention'
  | 'reblog'
  | 'favourite'
  | 'poll'
  | 'status'
  | 'update'
  | 'admin.sign_up'
  | 'admin.report';

export type PushPolicy = 'all' | 'followed' | 'follower' | 'none';

export interface PushSubscription {
  id: string;
  endpoint: string;
  alerts: PushAlerts;
  server_key: string;
  policy?: PushPolicy;
}

export interface PushAlerts {
  follow: boolean;
  favourite: boolean;
  reblog: boolean;
  mention: boolean;
  poll: boolean;
  follow_request: boolean;
  status: boolean;
  update: boolean;
}

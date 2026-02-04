export type ListRepliesPolicy = 'followed' | 'list' | 'none';

export interface List {
  id: string;
  title: string;
  replies_policy?: ListRepliesPolicy;
  exclusive?: boolean;
}

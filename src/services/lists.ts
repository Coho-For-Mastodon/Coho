import type { List, ListRepliesPolicy, Account, Post } from '../mastodon/types';
import {
  getLists as mastodonGetLists,
  createList as mastodonCreateList,
  updateList as mastodonUpdateList,
  deleteList as mastodonDeleteList,
  getListAccounts as mastodonGetListAccounts,
  addAccountsToList as mastodonAddAccountsToList,
  removeAccountsFromList as mastodonRemoveAccountsFromList,
  getListTimeline as mastodonGetListTimeline,
} from '../mastodon/api/lists';

export const getLists = async (): Promise<List[]> => {
  return mastodonGetLists();
};

export const createList = async (
  title: string,
  repliesPolicy?: ListRepliesPolicy
): Promise<List> => {
  return mastodonCreateList(title, repliesPolicy);
};

export const updateList = async (
  id: string,
  title: string,
  repliesPolicy?: ListRepliesPolicy
): Promise<List> => {
  return mastodonUpdateList(id, title, repliesPolicy);
};

export const deleteList = async (id: string): Promise<void> => {
  await mastodonDeleteList(id);
};

export const getListAccounts = async (id: string): Promise<Account[]> => {
  return mastodonGetListAccounts(id);
};

export const addAccountsToList = async (
  id: string,
  accountIds: string[]
): Promise<void> => {
  await mastodonAddAccountsToList(id, accountIds);
};

export const removeAccountsFromList = async (
  id: string,
  accountIds: string[]
): Promise<void> => {
  await mastodonRemoveAccountsFromList(id, accountIds);
};

export const getListTimeline = async (
  id: string,
  maxId?: string
): Promise<Post[]> => {
  return mastodonGetListTimeline(id, maxId) as Promise<Post[]>;
};

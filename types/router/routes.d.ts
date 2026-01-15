import {
  lazy,
  type Route,
  type RouterOptions,
  type RouterPlugin,
  type NavigationState,
  Router,
} from './nav-router.js';
import type { Post } from '../interfaces/Post.js';
import type { Account } from '../mastodon/types/index.js';
export { lazy, Router };
export type { Route, RouterOptions, RouterPlugin, NavigationState };
/**
 * App-specific navigation state that can be passed during navigation.
 * Use this to pass data (like a Post or Account) to the destination page.
 */
export interface AppNavigationState extends NavigationState {
  post?: Post;
  account?: Account;
}
/**
 * Router instance using the Navigation API
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 */
export declare const router: Router;

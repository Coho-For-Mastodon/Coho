import { html } from 'lit';
import { type Route, type NavigationState, Router, lazy } from 'web-router';
import type { TemplateResult } from 'lit';
import type { Post } from '../interfaces/Post.js';
import type { Account, Conversation } from '../mastodon/types/index.js';

/**
 * App-specific navigation state that can be passed during navigation.
 * Use this to pass data (like a Post or Account) to the destination page.
 */
export interface AppNavigationState extends NavigationState {
  post?: Post;
  account?: Account;
  conversation?: Conversation;
  newRecipient?: Account;
}

/**
 * Route configuration for the application
 */
const routes: Route<TemplateResult>[] = [
  {
    path: '/',
    title: 'login',
    render: () => html`<app-login></app-login>`,
  },
  {
    path: '/auth/callback',
    title: 'signing in',
    plugins: [lazy(() => import('../pages/auth-callback.js'))],
    render: () => html`<auth-callback></auth-callback>`,
  },
  {
    path: '/share',
    title: 'share',
    plugins: [lazy(() => import('../pages/app-home.js'))],
    render: () => html`<app-home></app-home>`,
  },
  {
    path: '/home',
    title: 'home',
    plugins: [lazy(() => import('../pages/app-home.js'))],
    render: () => html`<app-home></app-home>`,
  },
  {
    path: '/search',
    title: 'search',
    plugins: [lazy(() => import('../pages/search-page.js'))],
    render: () => html`<search-page></search-page>`,
  },
  {
    path: '/account',
    title: 'profile',
    plugins: [lazy(() => import('../pages/app-profile.js'))],
    render: () => html`<app-profile></app-profile>`,
  },
  {
    path: '/account/post/:id',
    title: 'post',
    plugins: [lazy(() => import('../pages/post-detail.js'))],
    render: () => html`<post-detail></post-detail>`,
  },
  {
    path: '/followers',
    title: 'followers',
    plugins: [lazy(() => import('../pages/app-followers.js'))],
    render: () => html`<app-followers></app-followers>`,
  },
  {
    path: '/about',
    title: 'about',
    plugins: [lazy(() => import('../pages/app-about/app-about.js'))],
    render: () => html`<app-about></app-about>`,
  },
  {
    path: '/messages',
    title: 'messages',
    plugins: [lazy(() => import('../pages/app-messages.js'))],
    render: () => html`<app-messages></app-messages>`,
  },
  {
    path: '/messages/:id',
    title: 'conversation',
    plugins: [lazy(() => import('../pages/conversation-thread.js'))],
    render: () => html`<conversation-thread></conversation-thread>`,
  },
  {
    path: '/following',
    title: 'following',
    plugins: [lazy(() => import('../pages/app-following.js'))],
    render: () => html`<app-following></app-following>`,
  },
  {
    path: '/muted',
    title: 'muted accounts',
    plugins: [lazy(() => import('../pages/app-muted.js'))],
    render: () => html`<app-muted></app-muted>`,
  },
  {
    path: '/blocked',
    title: 'blocked accounts',
    plugins: [lazy(() => import('../pages/app-blocked.js'))],
    render: () => html`<app-blocked></app-blocked>`,
  },
  {
    path: '/domain-blocks',
    title: 'blocked domains',
    plugins: [lazy(() => import('../pages/app-domain-blocks.js'))],
    render: () => html`<app-domain-blocks></app-domain-blocks>`,
  },
  {
    path: '/follow-requests',
    title: 'follow requests',
    plugins: [lazy(() => import('../pages/app-follow-requests.js'))],
    render: () => html`<app-follow-requests></app-follow-requests>`,
  },
  {
    path: '/announcements',
    title: 'server announcements',
    plugins: [lazy(() => import('../pages/app-announcements.js'))],
    render: () => html`<app-announcements></app-announcements>`,
  },
  {
    path: '/hashtag',
    title: 'hashtags',
    plugins: [lazy(() => import('../pages/app-hashtags.js'))],
    render: () => html`<app-hashtags></app-hashtags>`,
  },
  {
    path: '/followed-hashtags',
    title: 'followed hashtags',
    plugins: [lazy(() => import('../pages/app-followed-hashtags.js'))],
    render: () => html`<app-followed-hashtags></app-followed-hashtags>`,
  },
  {
    path: '/home/post/:id',
    title: 'post',
    plugins: [lazy(() => import('../pages/post-detail.js'))],
    render: () => html`<post-detail></post-detail>`,
  },
  {
    path: '/home/post',
    title: 'post',
    plugins: [lazy(() => import('../pages/post-detail.js'))],
    render: () => html`<post-detail></post-detail>`,
  },
  {
    path: '/post/:id',
    title: 'post',
    plugins: [lazy(() => import('../pages/post-detail.js'))],
    render: () => html`<post-detail></post-detail>`,
  },
  {
    path: '/editaccount',
    title: 'edit account',
    plugins: [lazy(() => import('../pages/edit-page.js'))],
    render: () => html`<edit-page></edit-page>`,
  },
  {
    path: '/explore',
    title: 'explore',
    plugins: [lazy(() => import('../pages/app-explore.js'))],
    render: () => html`<app-explore></app-explore>`,
  },
  {
    path: '/media',
    title: 'media',
    plugins: [lazy(() => import('../pages/app-media.js'))],
    render: () => html`<app-media></app-media>`,
  },
  {
    path: '/createaccount',
    title: 'create account',
    plugins: [lazy(() => import('../pages/create-account.js'))],
    render: () => html`<create-account></create-account>`,
  },
];

/**
 * Router instance using the Navigation API
 * https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API
 */
export const router = new Router<TemplateResult>({ routes });

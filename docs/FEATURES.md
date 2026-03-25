# Mastodon Feature Coverage

Coho covers the core post lifecycle (create, edit, delete, boost, favourite, bookmark, pin, translate), timelines (home, local, federated, hashtag, list), notifications, search, profiles, lists, polls, media upload/edit, reporting, and offline/background sync. This document tracks both **completed** and **remaining** Mastodon API features.

## Status Summary

| Feature                             | Priority | Status         |
| ----------------------------------- | -------- | -------------- |
| Direct Messages / Conversations     | Critical | ✅ Implemented |
| Follow Requests                     | Critical | ✅ Implemented |
| Muted & Blocked Accounts Management | Critical | ✅ Implemented |
| Content Filters (Keyword Filters)   | Critical | ✅ Implemented |
| Custom Emoji Support                | Critical | ✅ Implemented |
| Favourited-by / Reblogged-by        | Critical | ✅ Implemented |
| Scheduled Statuses Management       | High     | ✅ Implemented |
| Multi-Account Support               | High     | ✅ Implemented |
| Conversation / Thread Muting        | High     | ✅ Implemented |
| Edit History Viewing                | High     | ✅ Implemented |
| Followed Hashtags                   | High     | ✅ Implemented |
| Server Announcements                | Medium   | ✅ Implemented |
| Who to Follow / Suggestions         | Medium   | ✅ Implemented |
| Notification Preferences UI         | Medium   | ✅ Implemented |
| Preferences Sync                    | Medium   | ✅ Implemented |
| Audio Player                        | Medium   | ⚠️ Partial     |
| Domain Blocks                       | Medium   | ❌ Missing     |
| Featured Hashtags                   | Medium   | ❌ Missing     |

---

## Completed Features

### 1. Direct Messages / Conversations

Full conversation list, thread view, new message flow, search for recipients, and delete conversations.

**Key files:** `src/pages/app-messages.ts`, `src/pages/conversation-thread.ts`, `src/mastodon/api/messages.ts`, `src/services/messages.ts`

### 2. Follow Requests

List pending follow requests and approve or reject them. Accessible from settings.

**Key files:** `src/pages/app-follow-requests.ts`, `src/mastodon/api/follow-requests.ts`

### 3. Muted & Blocked Accounts Management

Dedicated pages listing muted and blocked accounts with unmute/unblock actions and CSV import/export. Accessible from settings.

**Key files:** `src/pages/app-muted.ts`, `src/pages/app-blocked.ts`, `src/services/account.ts` (`getMutedAccounts`, `getBlockedAccounts`)

### 4. Content Filters (Keyword Filters)

Full CRUD for Mastodon v2 filters with client-side filtering of timeline posts. UI supports keyword management, context selection (home, notifications, public, thread, account), expiry, and filter actions (hide/warn).

**Key files:** `src/mastodon/api/filters.ts`, `src/services/filters.ts` (`applyFilters`, `filterTimelinePosts`), `src/components/filters-dialog.ts`

### 5. Custom Emoji Support

Fetches instance custom emoji list, caches in IndexedDB, renders `:shortcode:` as `<img>` tags in post content, and provides an emoji picker in the composer.

**Key files:** `src/mastodon/api/custom-emojis.ts`, `src/services/custom-emojis.ts`, `src/utils/emoji-parser.ts`, `src/components/emoji-picker.ts`

### 6. Favourited-by / Reblogged-by

Separate API calls for `GET /api/v1/statuses/:id/favourited_by` and `GET /api/v1/statuses/:id/reblogged_by` to show which accounts interacted with a post.

**Key files:** `src/mastodon/api/statuses.ts` (`getFavouritedBy`, `getRebloggedBy`), `src/services/posts.ts`

### 7. Scheduled Statuses Management

UI to list, expand, reschedule, and cancel scheduled posts. Integrated into the home page via lazy loading.

**Key files:** `src/mastodon/api/scheduled-statuses.ts`, `src/services/scheduled-statuses.ts`, `src/components/scheduled-statuses-dialog.ts`

### 8. Multi-Account Support

Store multiple accounts, switch between them, and remove saved accounts. Scoped storage per account.

**Key files:** `src/services/auth-session.ts`, `src/components/account-manager.ts`

### 9. Conversation / Thread Muting

Mute/unmute conversations via `POST /api/v1/statuses/:id/mute` and `unmute`. Toggle available in post action menus with `conversation-mute-change` event for UI updates.

**Key files:** `src/services/posts.ts` (`muteConversation`, `unmuteConversation`), `src/components/timeline-item.ts`, `src/components/timeline-renderers.ts`

### 10. Edit History Viewing

View the full edit history of a post, including content changes, media, spoiler text, and sensitive flags. Accessible via the "(edited)" indicator and the post menu.

**Key files:** `src/components/post-edit-history-dialog.ts`, `src/mastodon/api/statuses.ts` (`getEditHistory`)

### 11. Followed Hashtags

Follow and unfollow hashtags from the hashtag timeline page. Followed hashtags appear in the home timeline. A dedicated management page lists all followed hashtags with unfollow controls.

**Key files:** `src/mastodon/api/tags.ts`, `src/mastodon/types/tag.ts`, `src/pages/app-hashtags.ts`, `src/pages/app-followed-hashtags.ts`

### 12. Server Announcements

View and dismiss instance announcements. Latest announcement shown in settings, full list on a dedicated page.

**Key files:** `src/mastodon/api/announcements.ts`, `src/pages/app-announcements.ts`, `src/components/settings-drawer-content.ts`

### 13. Who to Follow / Suggestions

The explore page "For You" tab fetches `GET /api/v2/suggestions` and displays suggested accounts to follow.

### 14. Notification Preferences UI

Full dialog with toggles for each notification type (follow, favourite, reblog, mention, poll, follow_request, status, update), push policy selection, and enable/disable push.

**Key files:** `src/components/notification-preferences-dialog.ts`

### 15. Preferences Sync

Fetches server-side user preferences (`GET /api/v1/preferences`) on login and applies defaults for posting visibility, sensitive flag, and language in the composer.

**Key files:** `src/mastodon/api/preferences.ts`, `src/app-index.ts`, `src/components/post-composer.ts`

### 16. Audio Player (Partial)

Audio attachments render using native `<audio controls>` in the media carousel and conversation threads.

**Key files:** `src/components/image-carousel.ts`, `src/pages/conversation-thread.ts`

**Remaining polish:** A custom styled audio player with waveform visualization and playback progress persistence would improve the experience, but basic playback works today.

---

## Remaining Work

### Medium Priority -- Polish and completeness

#### 1. Domain Blocks

**Current state:** Only a `domain_blocking` type field exists in the account types. No API calls.

**What's needed:** `GET/POST/DELETE /api/v1/domain_blocks`. UI to view blocked domains and block/unblock entire instances (e.g., from a post or profile context menu).

#### 2. Featured Hashtags

**Current state:** No references in `src/`.

**What's needed:** `GET/POST/DELETE /api/v1/featured_tags`. UI on the user's own profile to showcase hashtags, and display featured hashtags on other users' profiles.

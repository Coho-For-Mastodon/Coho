# Mastodon Feature Coverage

Coho covers the core post lifecycle (create, edit, delete, boost, favourite, bookmark, pin, translate), timelines (home, local, federated, hashtag, list), notifications, search, profiles, lists, polls, media upload/edit, reporting, and offline/background sync. This document tracks both **completed** and **remaining** Mastodon API features.

## Status Summary

| Feature                             | Priority | Status         |
| ----------------------------------- | -------- | -------------- |
| Direct Messages / Conversations     | Critical | ✅ Implemented |
| Follow Requests                     | Critical | ❌ Missing     |
| Muted & Blocked Accounts Management | Critical | ✅ Implemented |
| Content Filters (Keyword Filters)   | Critical | ✅ Implemented |
| Custom Emoji Support                | Critical | ✅ Implemented |
| Scheduled Statuses Management       | High     | ✅ Implemented |
| WebSocket Streaming Integration     | High     | ❌ Missing     |
| Multi-Account Support               | High     | ❌ Missing     |
| Conversation / Thread Muting        | High     | ✅ Implemented |
| Edit History Viewing                | High     | ❌ Missing     |
| Server Announcements                | Medium   | ❌ Missing     |
| Who to Follow / Suggestions         | Medium   | ✅ Implemented |
| Domain Blocks                       | Medium   | ❌ Missing     |
| Featured Hashtags                   | Medium   | ❌ Missing     |
| Audio Player                        | Medium   | ⚠️ Partial     |
| Notification Preferences UI         | Medium   | ✅ Implemented |
| Preferences Sync                    | Medium   | ❌ Missing     |

---

## Completed Features

### 1. Direct Messages / Conversations

Full conversation list, thread view, new message flow, search for recipients, and delete conversations.

**Key files:** `src/pages/app-messages.ts`, `src/pages/conversation-thread.ts`, `src/mastodon/api/messages.ts`, `src/services/messages.ts`

### 2. Muted & Blocked Accounts Management

Dedicated pages listing muted and blocked accounts with unmute/unblock actions. Accessible from settings.

**Key files:** `src/pages/app-muted.ts`, `src/pages/app-blocked.ts`, `src/services/account.ts` (`getMutedAccounts`, `getBlockedAccounts`)

### 3. Content Filters (Keyword Filters)

Full CRUD for Mastodon v2 filters with client-side filtering of timeline posts. UI supports keyword management, context selection (home, notifications, public, thread, account), expiry, and filter actions (hide/warn).

**Key files:** `src/mastodon/api/filters.ts`, `src/services/filters.ts` (`applyFilters`, `filterTimelinePosts`), `src/components/filters-dialog.ts`

### 4. Custom Emoji Support

Fetches instance custom emoji list, caches in IndexedDB, renders `:shortcode:` as `<img>` tags in post content, and provides an emoji picker in the composer.

**Key files:** `src/mastodon/api/custom-emojis.ts`, `src/services/custom-emojis.ts`, `src/utils/emoji-parser.ts`, `src/components/emoji-picker.ts`

### 5. Scheduled Statuses Management

UI to list, expand, reschedule, and cancel scheduled posts. Integrated into the home page via lazy loading.

**Key files:** `src/mastodon/api/scheduled-statuses.ts`, `src/services/scheduled-statuses.ts`, `src/components/scheduled-statuses-dialog.ts`

### 6. Conversation / Thread Muting

Mute/unmute conversations via `POST /api/v1/statuses/:id/mute` and `unmute`. Toggle available in post action menus with `conversation-mute-change` event for UI updates.

**Key files:** `src/services/posts.ts` (`muteConversation`, `unmuteConversation`), `src/components/timeline-item.ts`, `src/components/timeline-renderers.ts`

### 7. Who to Follow / Suggestions

The explore page "For You" tab fetches `GET /api/v2/suggestions` and displays suggested accounts to follow.

### 8. Notification Preferences UI

Full dialog with toggles for each notification type (follow, favourite, reblog, mention, poll, follow_request, status, update), push policy selection, and enable/disable push.

**Key files:** `src/components/notification-preferences-dialog.ts`

### 9. Audio Player (Partial)

Audio attachments render using native `<audio controls>` in the media carousel and conversation threads.

**Key files:** `src/components/image-carousel.ts`, `src/pages/conversation-thread.ts`

**Remaining polish:** A custom styled audio player with waveform visualization and playback progress persistence would improve the experience, but basic playback works today.

---

## Remaining Work

### Critical -- Users will hit these regularly

#### 1. Follow Requests (for locked accounts)

**Current state:** No API calls and no UI for follow requests. Notification type definitions exist but there is no way to approve or reject requests.

**What's needed:** `GET /api/v1/follow_requests` to list pending requests, `POST /api/v1/follow_requests/:id/authorize` and `reject`. A UI accessible from notifications or settings.

**Why critical:** Users with locked/private accounts cannot approve new followers at all.

### High Priority -- Noticeable gaps for daily-driver use

#### 2. WebSocket Streaming Integration

**Current state:** A streaming worker exists at `src/utils/timeline-worker.ts` (27 lines) but is never instantiated from any page or component.

**What's needed:** Connect the worker to timeline and notification components so new posts and notifications appear in real time without manual refresh.

**Impact:** The home timeline requires manual refresh or pull-to-refresh. New posts and notifications don't appear in real time.

#### 3. Multi-Account Support

**Current state:** Single account per installation. Token stored in localStorage with fixed keys.

**What's needed:** Infrastructure to store multiple tokens keyed by instance+account, an account switcher UI, and scoped storage so each account's data is isolated.

**Impact:** Many Mastodon users maintain accounts on multiple instances. Switching requires logging out and back in.

#### 4. Edit History Viewing

**Current state:** Edited posts show an "edited" indicator, but there is no UI to view the edit history.

**What's needed:** Call `GET /api/v1/statuses/:id/history` and display a diff or timeline of changes (content, media, sensitive flag, spoiler text).

**Impact:** Users cannot see what changed in an edited post.

### Medium Priority -- Polish and completeness

#### 5. Server Announcements

**Current state:** No API client, service, or UI. Only an E2E test mock returning `[]`.

**What's needed:** `GET /api/v1/announcements`, `POST /api/v1/announcements/:id/dismiss`, and a UI to display and dismiss instance announcements. Support for announcement reactions is a nice-to-have.

#### 6. Domain Blocks

**Current state:** Only a `domain_blocking` type field exists in the account types. No API calls.

**What's needed:** `GET/POST/DELETE /api/v1/domain_blocks`. UI to view blocked domains and block/unblock entire instances (e.g., from a post or profile context menu).

#### 7. Featured Hashtags

**Current state:** No references in `src/`.

**What's needed:** `GET/POST/DELETE /api/v1/featured_tags`. UI on the user's own profile to showcase hashtags, and display featured hashtags on other users' profiles.

#### 8. Preferences Sync

**Current state:** `GET /api/v1/preferences` is never called.

**What's needed:** Fetch server-side defaults on login and respect them for posting visibility, default language, and sensitive content flag. These should serve as initial values in the composer and settings.

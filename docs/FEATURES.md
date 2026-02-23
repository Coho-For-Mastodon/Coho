Missing Mastodon Features Analysis

Coho already covers the core post lifecycle (create, edit, delete, boost, favourite, bookmark, pin, translate), timelines (home, local, federated, hashtag, list), notifications, search, profiles, lists, polls, media upload/edit, reporting, and offline/background sync. Below are the gaps, ranked by how critical they are for a functioning Mastodon client.

Critical -- Users will hit these regularly

1. Direct Messages / Conversations

Current state: app-messages.ts is a placeholder that says "Coming soon..."

What's needed: Conversation list UI, conversation thread view, ability to compose DMs (compose with visibility: 'direct'). The API endpoint GET /api/v1/conversations is already wired via Firebase Functions.

Why critical: DMs are a core social feature. Users with no other Mastodon client installed cannot read or reply to direct messages.

2. Follow Requests (for locked accounts)

Current state: No API calls and no UI for follow requests.

What's needed: GET /api/v1/follow_requests to list pending requests, POST /api/v1/follow_requests/:id/authorize and reject. A UI accessible from notifications or settings.

Why critical: Users with locked/private accounts cannot approve new followers at all.

3. Muted and Blocked Accounts Management

Current state: Mute/block actions exist on profiles, but there is no screen to view or manage the list of muted/blocked accounts (GET /api/v1/mutes, GET /api/v1/blocks).

What's needed: Pages or dialogs listing muted and blocked accounts with the ability to unmute/unblock.

Why critical: Without this, users cannot review or undo past mute/block decisions.

4. Content Filters (Keyword Filters)

Current state: No API calls, no types, and no UI for the Mastodon v2 filter system.

What's needed: GET/POST/PUT/DELETE /api/v2/filters, plus client-side filtering of timeline posts that match active filters. UI to create/edit/delete filters with keywords, expiry, and context (home, notifications, public, thread, account).

Why critical: Filters are the primary tool users have to curate their experience and avoid harmful/unwanted content. Without them, the client cannot honour server-side filters either.

5. Custom Emoji Support

Current state: Types for Emoji exist, but GET /api/v1/custom_emojis is never called. Custom emoji shortcodes in post content (:emoji_name:) are not rendered as images.

What's needed: Fetch the instance's custom emoji list, render shortcodes in post HTML as <img> tags, and provide an emoji picker in the composer.

Why critical: Custom emojis are ubiquitous on most Mastodon instances and are a core part of fediverse culture. Without rendering them, posts display raw :shortcode: text.

High Priority -- Noticeable gaps for daily-driver use

6. Scheduled Statuses Management

Current state: The composer supports creating scheduled posts (just added on this branch), but there is no UI to list, view, edit, or cancel scheduled statuses (GET/PUT/DELETE /api/v1/scheduled_statuses).

Impact: Users can schedule a post but have no way to verify it's queued, change the time, or cancel it.

7. WebSocket Streaming Integration

Current state: A streaming worker exists at [src/utils/timeline-worker.ts](src/utils/timeline-worker.ts) but is not connected to any timeline or notification component.

Impact: The home timeline requires manual refresh or pull-to-refresh. New posts and notifications don't appear in real time.

8. Multi-Account Support

Current state: Single account per installation. Token stored in localStorage with fixed keys.

Impact: Many Mastodon users maintain accounts on multiple instances. Switching requires logging out and back in.

9. Conversation/Thread Muting

Current state: No API calls for POST /api/v1/statuses/:id/mute or unmute.

Impact: Users cannot silence notifications from a particular thread they were mentioned in.

10. Edit History Viewing

Current state: Edited posts show an "edited" indicator, but there is no UI to view the edit history (GET /api/v1/statuses/:id/history).

Impact: Users cannot see what changed in an edited post.

Medium Priority -- Polish and completeness

11. Server Announcements

No GET /api/v1/announcements or dismissal UI. Instance admins use announcements for important notices (e.g., maintenance, policy changes).

12. Who to Follow / Suggestions

No GET /api/v2/suggestions. The app relies solely on search for user discovery.

13. Domain Blocks

No GET/POST/DELETE /api/v1/domain_blocks. Users cannot block an entire instance.

14. Featured Hashtags

No GET/POST/DELETE /api/v1/featured_tags. Users cannot showcase hashtags on their profile.

15. Audio Player

No dedicated audio player component. Audio attachments may not play gracefully.

16. Notification Preferences UI

Push subscription is created but there is no UI to toggle which notification types trigger push alerts or to disable push entirely.

17. Preferences Sync

GET /api/v1/preferences is never called. Server-side defaults for visibility, language, and sensitive content are not respected.

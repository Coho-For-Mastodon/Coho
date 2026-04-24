import type { Post } from '../interfaces/Post';
import { router } from '../router/routes';
import { lookupAccountByAcct } from '../mastodon/api/accounts';
import type { Account } from '../mastodon/types/account';

type Mention = Post['mentions'][number];
type Tag = Post['tags'][number];

function normalizeAcct(text: string | null): string {
  return (text || '').trim().replace(/^@/, '');
}

function normalizeTag(text: string | null): string {
  return (text || '').trim().replace(/^#/, '');
}

function extractTagFromHref(href: string): string | null {
  if (!href) return null;

  try {
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const url = new URL(href, base);
    const parts = url.pathname.split('/').filter(Boolean);
    const tagIndex = parts.findIndex(
      (part) => part === 'tags' || part === 'tag'
    );
    if (tagIndex >= 0 && parts[tagIndex + 1]) {
      return decodeURIComponent(parts[tagIndex + 1]);
    }
  } catch {
    // Ignore URL parsing failures and fall back to regex.
  }

  const match =
    href.match(/\/tags\/([^/?#]+)/i) || href.match(/\/tag\/([^/?#]+)/i);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  return null;
}

function findMention(
  post: Post | null | undefined,
  href: string,
  linkText: string | null
): Mention | undefined {
  const mentions = post?.mentions;
  if (!mentions || mentions.length === 0) return undefined;

  const normalizedHref = href.trim();
  const normalizedText = normalizeAcct(linkText);

  return mentions.find((mention) => {
    if (mention.url === normalizedHref) return true;
    if (
      normalizedText &&
      (mention.acct === normalizedText || mention.username === normalizedText)
    ) {
      return true;
    }
    if (mention.acct && normalizedHref.endsWith(`/@${mention.acct}`)) {
      return true;
    }
    if (mention.username && normalizedHref.endsWith(`/@${mention.username}`)) {
      return true;
    }
    return false;
  });
}

function findHashtag(
  post: Post | null | undefined,
  href: string,
  linkText: string | null
): Tag | undefined {
  const tags = post?.tags;
  if (!tags || tags.length === 0) return undefined;

  const normalizedHref = href.trim();
  const normalizedText = normalizeTag(linkText).toLowerCase();
  const hrefTag = extractTagFromHref(normalizedHref)?.toLowerCase();

  return tags.find((tag) => {
    const tagName = (tag.name || '').toLowerCase();
    if (!tagName) return false;
    if (tag.url === normalizedHref) return true;
    if (normalizedText && tagName === normalizedText) return true;
    if (hrefTag && tagName === hrefTag) return true;
    return false;
  });
}

function getAnchorFromEvent(event: Event): HTMLAnchorElement | null {
  const target = event.target as Element | null;
  if (target && 'closest' in target) {
    const closestAnchor = target.closest('a');
    if (closestAnchor instanceof HTMLAnchorElement) return closestAnchor;
  }

  const path =
    typeof event.composedPath === 'function' ? event.composedPath() : [];
  for (const item of path) {
    if (item instanceof HTMLAnchorElement) return item;
  }

  return null;
}

export function handleStatusContentClick(
  event: Event,
  post: Post | null | undefined,
  onNonLinkClick?: () => void
) {
  if (event.defaultPrevented) return;

  const anchor = getAnchorFromEvent(event);

  if (!anchor) {
    onNonLinkClick?.();
    return;
  }

  const href = anchor.getAttribute('href') || '';
  const mention = findMention(post, href, anchor.textContent);
  const hashtag = mention
    ? undefined
    : findHashtag(post, href, anchor.textContent);

  if (mention) {
    event.preventDefault();
    event.stopPropagation();
    router.navigate(`/account?id=${mention.id}`);
    return;
  }

  if (hashtag) {
    const tagName = hashtag.name || normalizeTag(anchor.textContent);
    if (tagName) {
      event.preventDefault();
      event.stopPropagation();
      router.navigate(`/hashtag?tag=${encodeURIComponent(tagName)}`);
      return;
    }
  }

  // Let normal links behave as normal, but avoid bubbling to open-post handlers.
  event.stopPropagation();
}

// ---------------------------------------------------------------------------
// Hover profile card utilities
// ---------------------------------------------------------------------------

const _accountCache = new Map<string, Account>();
let _hoverTimer: ReturnType<typeof setTimeout> | undefined;
let _leaveTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * Call on mouseover of the post content area.
 * If the mouse is over a known @mention link, shows the profile hover card
 * after a short delay.
 */
export function handleMentionMouseOver(
  event: Event,
  post: Post | null | undefined
) {
  const anchor = getAnchorFromEvent(event);
  if (!anchor) return;

  const href = anchor.getAttribute('href') || '';
  const mention = findMention(post, href, anchor.textContent);
  if (!mention) return;

  // Cancel any pending hide
  if (_leaveTimer !== undefined) {
    clearTimeout(_leaveTimer);
    _leaveTimer = undefined;
  }

  // Reset pending show timer
  if (_hoverTimer !== undefined) {
    clearTimeout(_hoverTimer);
  }

  _hoverTimer = setTimeout(() => {
    _hoverTimer = undefined;

    import('../components/profile-hover-card').then(
      ({ getProfileHoverCard }) => {
        const card = getProfileHoverCard();

        // Register cancel-hide callback so card mouse-enter cancels our leave timer
        card.registerCancelHide(() => {
          if (_leaveTimer !== undefined) {
            clearTimeout(_leaveTimer);
            _leaveTimer = undefined;
          }
        });

        // Show loading skeleton immediately
        card.account = null;
        card.loading = true;
        card.showAt(anchor);

        // Serve from cache or fetch
        const cached = _accountCache.get(mention.acct);
        if (cached) {
          card.account = cached;
          card.loading = false;
        } else {
          lookupAccountByAcct(mention.acct)
            .then((account) => {
              if (account) {
                _accountCache.set(mention.acct, account);
                card.account = account;
                card.loading = false;
              } else {
                card.hide();
              }
            })
            .catch(() => {
              card.hide();
            });
        }
      }
    );
  }, 300);
}

/**
 * Call on mouseleave of the post content area.
 * Hides the profile hover card after a short delay (giving the user time
 * to move the mouse into the card itself, which cancels the timer).
 */
export function handleMentionMouseLeave() {
  if (_hoverTimer !== undefined) {
    clearTimeout(_hoverTimer);
    _hoverTimer = undefined;
  }

  _leaveTimer = setTimeout(() => {
    _leaveTimer = undefined;
    import('../components/profile-hover-card').then(({ getProfileHoverCard }) =>
      getProfileHoverCard().hide()
    );
  }, 150);
}

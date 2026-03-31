import hotkeys from 'hotkeys-js';
import { router } from '../router/routes';

// Only allow shortcuts when NOT focused on an input/textarea/contenteditable.
// This replaces the old Alt-modifier approach — single keys are safe because
// they won't fire while the user is typing.
hotkeys.filter = function (event: KeyboardEvent) {
  const target = event.target as HTMLElement | null;
  if (!target) return true;

  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable) {
    return false;
  }

  // Also check shadow DOM: the target may be inside an input in a shadow root
  const composed = event.composedPath?.();
  if (composed) {
    for (const el of composed) {
      if (el instanceof HTMLElement) {
        const t = el.tagName;
        if (t === 'INPUT' || t === 'TEXTAREA' || el.isContentEditable) {
          return false;
        }
      }
    }
  }

  return true;
};

export function init() {
  // Navigation shortcuts (hold g + press key)
  hotkeys('g+h,g+n,g+s,g+b,g+f,g+p,g+m', (event, handler) => {
    event.preventDefault();

    switch (handler.key) {
      case 'g+h':
        handleGoToHome();
        break;
      case 'g+n':
        handleGoToNotifications();
        break;
      case 'g+s':
        handleGoToSearch();
        break;
      case 'g+b':
        handleGoToBookmarks();
        break;
      case 'g+f':
        handleGoToFavorites();
        break;
      case 'g+p':
        handleGoToProfile();
        break;
      case 'g+m':
        handleGoToMessages();
        break;
      default:
        break;
    }
  });

  // New post
  hotkeys('n', (event) => {
    event.preventDefault();
    handleNewPost();
  });

  // Focus search
  hotkeys('/', (event) => {
    event.preventDefault();
    handleFocusSearch();
  });

  // Show shortcuts help
  hotkeys('shift+/', (event) => {
    event.preventDefault();
    handleShowShortcutsHelp();
  });

  // Refresh timeline
  hotkeys('.', (event) => {
    event.preventDefault();
    handleRefreshTimeline();
  });

  // Escape
  hotkeys('escape', () => {
    const active = document.activeElement;
    const isInDialog =
      active?.closest('dialog') ||
      active?.closest('[role="dialog"]') ||
      active?.closest('[role="menu"]') ||
      active?.closest('[role="listbox"]') ||
      active?.closest('[role="combobox"]');
    if (!isInDialog) {
      handleEscape();
    }
  });
}

async function handleGoToHome() {
  await router.navigate('/home');
  window.dispatchEvent(
    new CustomEvent('switch-tab', { detail: { tab: 'general' } })
  );
}

async function handleGoToBookmarks() {
  await router.navigate('/home?tab=bookmarks');
  window.dispatchEvent(
    new CustomEvent('switch-tab', { detail: { tab: 'bookmarks' } })
  );
}

async function handleGoToFavorites() {
  await router.navigate('/home?tab=faves');
  window.dispatchEvent(
    new CustomEvent('switch-tab', { detail: { tab: 'faves' } })
  );
}

async function handleGoToNotifications() {
  await router.navigate('/home?tab=notifications');
  window.dispatchEvent(
    new CustomEvent('switch-tab', { detail: { tab: 'notifications' } })
  );
}

async function handleGoToSearch() {
  await router.navigate('/home?tab=search');
  window.dispatchEvent(
    new CustomEvent('switch-tab', { detail: { tab: 'search' } })
  );
}

async function handleGoToProfile() {
  const currentUserId = localStorage.getItem('currentUserId');
  if (currentUserId) {
    await router.navigate(`/account?id=${currentUserId}`);
  }
}

async function handleGoToMessages() {
  await router.navigate('/messages');
}

function handleNewPost() {
  window.dispatchEvent(new CustomEvent('open-post-dialog'));
}

function handleFocusSearch() {
  window.dispatchEvent(new CustomEvent('focus-search'));
}

function handleShowShortcutsHelp() {
  window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
}

function handleEscape() {
  window.dispatchEvent(new CustomEvent('global-escape'));
}

function handleRefreshTimeline() {
  window.dispatchEvent(new CustomEvent('refresh-timeline'));
}

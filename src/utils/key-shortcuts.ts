import hotkeys from 'hotkeys-js';
import { router } from '../router/routes';

// With modifier keys required, we allow shortcuts everywhere
// The alt key prevents conflicts with normal typing
hotkeys.filter = function () {
  return true;
};

export function init() {
  // Navigation shortcuts (alt+g followed by key)
  hotkeys(
    'alt+g+h,alt+g+n,alt+g+s,alt+g+b,alt+g+f,alt+g+p,alt+g+m',
    (event, handler) => {
      event.preventDefault();

      switch (handler.key) {
        case 'alt+g+h':
          handleGoToHome();
          break;
        case 'alt+g+n':
          handleGoToNotifications();
          break;
        case 'alt+g+s':
          handleGoToSearch();
          break;
        case 'alt+g+b':
          handleGoToBookmarks();
          break;
        case 'alt+g+f':
          handleGoToFavorites();
          break;
        case 'alt+g+p':
          handleGoToProfile();
          break;
        case 'alt+g+m':
          handleGoToMessages();
          break;
        default:
          break;
      }
    }
  );

  // Action shortcuts (all require alt modifier to avoid conflicts with typing)
  hotkeys('alt+n', (event) => {
    event.preventDefault();
    handleNewPost();
  });

  hotkeys('alt+/', (event) => {
    event.preventDefault();
    handleFocusSearch();
  });

  hotkeys('alt+shift+/', (event) => {
    event.preventDefault();
    handleShowShortcutsHelp();
  });

  hotkeys('escape', () => {
    handleEscape();
  });

  // Period to refresh timeline
  hotkeys('alt+.', (event) => {
    event.preventDefault();
    handleRefreshTimeline();
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
  // Get current user from localStorage
  const currentUserId = localStorage.getItem('currentUserId');
  if (currentUserId) {
    await router.navigate(`/account?id=${currentUserId}`);
  }
}

async function handleGoToMessages() {
  await router.navigate('/messages');
}

function handleNewPost() {
  // Dispatch event to open post dialog
  window.dispatchEvent(new CustomEvent('open-post-dialog'));
}

function handleFocusSearch() {
  // Dispatch event to focus search input
  window.dispatchEvent(new CustomEvent('focus-search'));
}

function handleShowShortcutsHelp() {
  // Dispatch event to show shortcuts help dialog
  window.dispatchEvent(new CustomEvent('show-shortcuts-help'));
}

function handleEscape() {
  // Dispatch escape event for dialogs/modals to handle
  window.dispatchEvent(new CustomEvent('global-escape'));
}

function handleRefreshTimeline() {
  // Dispatch event to refresh timeline
  window.dispatchEvent(new CustomEvent('refresh-timeline'));
}

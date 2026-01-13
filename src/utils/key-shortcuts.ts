import hotkeys from 'hotkeys-js';
import { router } from '../router/routes';

// Filter to disable shortcuts when typing in input fields
// Returns true if shortcuts should be processed
hotkeys.filter = function (event) {
  const target = event.target as HTMLElement;
  const tagName = target.tagName.toLowerCase();

  // Check for native form elements
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return false;
  }

  // Check for contenteditable
  if (target.isContentEditable) {
    return false;
  }

  // Check for web components with text input (md-text-field, md-text-area, etc.)
  const shadowHost = target.getRootNode() as ShadowRoot;
  if (shadowHost?.host) {
    const hostTagName = (shadowHost.host as HTMLElement).tagName.toLowerCase();
    if (
      hostTagName.includes('text-field') ||
      hostTagName.includes('text-area') ||
      hostTagName.includes('input')
    ) {
      return false;
    }
  }

  return true;
};

export function init() {
  // Navigation shortcuts (g+key combinations)
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

  // Action shortcuts
  hotkeys('n', (event) => {
    event.preventDefault();
    handleNewPost();
  });

  hotkeys('/', (event) => {
    event.preventDefault();
    handleFocusSearch();
  });

  hotkeys('shift+/', (event) => {
    event.preventDefault();
    handleShowShortcutsHelp();
  });

  hotkeys('escape', () => {
    handleEscape();
  });

  // Period to refresh timeline (Mastodon standard)
  hotkeys('.', (event) => {
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

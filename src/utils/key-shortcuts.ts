import hotkeys from 'hotkeys-js';
import { router } from './router';

export function init() {
  // Key Combination
  hotkeys('g+h,g+n,g+s,g+b,g+f', (event, handler) => {
    console.log('event', event);

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
      default:
        break;
    }
  });
}

async function handleGoToHome() {
  await router.navigate('/home');
}

async function handleGoToBookmarks() {
  await router.navigate('/home?tab=bookmarks');

  window.location.reload();
}

async function handleGoToFavorites() {
  await router.navigate('/home?tab=favorites');

  window.location.reload();
}

async function handleGoToNotifications() {
  console.log('go to notifications');
  await router.navigate('/home?tab=notifications');

  window.location.reload();
}

async function handleGoToSearch() {
  console.log('go to search');
  await router.navigate('/home?tab=search');

  window.location.reload();
}

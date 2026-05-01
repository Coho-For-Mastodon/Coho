import { css } from 'lit';
import { fadeInAnimation } from './animations';

/**
 * Styles for the app-home page component.
 */
export const homeStyles = css`
  app-timeline,
  app-bookmarks,
  app-notifications,
  app-favorites,
  search-page {
    margin-inline: 0;
    width: 100%;
    max-width: 600px;
  }

  md-tabs {
    height: calc(100vh - 54px);
    grid-column: 1 / 3;
    gap: 32px;
    margin-top: -54px;
    padding-top: 54px;
  }

  md-tab-panel::part(panel-content) {
    display: flex;
    justify-content: center;
  }

  md-tab {
    width: 80px;
    flex: none;
  }

  .new-post-container {
    padding: 16px 12px;
    width: 80px;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    margin-top: 8px;
  }

  .new-post-btn md-icon {
    width: 24px;
    height: 24px;
  }

  md-tab-panel {
    overflow: visible;
  }

  md-tab md-icon {
    width: 1.8em;
    height: 1.8em;
  }

  app-timeline.homeTimeline {
    width: 100%;
  }

  .notification-dot {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 8px;
    height: 8px;
    background-color: var(--md-sys-color-primary);
    border-radius: var(--md-sys-shape-corner-circle);
    z-index: 10;
  }

  @media (prefers-color-scheme: dark) {
    md-tab {
      --md-sys-color-on-surface-variant: #c4c6cf;
    }

    .tab-label {
      color: #c4c6cf;
    }
  }

  md-menu-item {
    --neutral-fill-stealth-hover: #141314;
    color: white;
  }

  #install-dialog::part(body) {
    padding: 0;
  }

  md-menu {
    background: #ffffff14;
    backdrop-filter: blur(48px);
    color: white;
    z-index: 99;
  }

  @media (prefers-color-scheme: light) {
    md-menu-item {
      --neutral-fill-stealth-hover: white;
      color: black;
    }

    md-menu {
      background: rgb(235 235 235);
      backdrop-filter: none;
    }
  }

  #no-replies {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #replies-drawer ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  main {
    padding-top: calc(54px + env(safe-area-inset-top, 0px));
    display: grid;
    grid-template-columns: var(--layout-nav-width, 80px) 1fr var(
        --layout-sidebar-width,
        320px
      );
    gap: var(--layout-gap, 32px);
    margin: 0 auto;
    max-width: var(--layout-max-width, 1200px);
  }

  otter-drawer::part(base) {
    z-index: 99999;
  }

  otter-drawer::part(body) {
    overflow-x: hidden;
    backdrop-filter: blur(40px);
    content-visibility: auto;
    contain: strict;
  }

  #mobile-actions {
    position: fixed;
    bottom: 90px;
    right: 16px;
    display: none;

    z-index: 100;
  }

  @media (min-width: 821px) and (max-width: 1030px) {
    main {
      grid-template-columns: 1fr;
    }

    md-tabs {
      grid-column: 1;
    }
  }

  @media (max-width: 820px) {
    otter-drawer::part(base) {
      margin-top: calc(env(safe-area-inset-top, 0px));
    }

    md-tab-panel {
      max-width: unset;
    }

    md-tab {
      flex: 1;
      width: auto;
    }

    .new-post-container {
      display: none;
    }

    app-timeline,
    app-bookmarks,
    app-notifications,
    app-favorites,
    search-page {
      margin-inline: initial;
      width: 100%;
      scrollbar-width: none;
    }

    #mobile-actions {
      display: flex;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 86px);
      z-index: 100;
    }

    #mobile-actions md-button md-icon {
      height: 24px;
      width: 24px;
    }

    main {
      display: block;
      padding-top: 0;
      margin-top: initial;
      margin-left: 0;
      position: fixed;
      inset: 0;
      overflow: hidden;
    }

    md-tabs {
      position: static;
      height: 100%;
      width: 100%;
      gap: 0;
    }

    md-tab-panel {
      height: 100%;
      overflow-y: auto;
      -webkit-overflow-scrolling: touch;
      padding-top: calc(50px + env(safe-area-inset-top, 0px));
      scrollbar-color: var(--md-sys-scrollbar-thumb-color)
        var(--md-sys-color-background);
    }

    md-tab-panel::-webkit-scrollbar-track {
      background: var(--md-sys-color-background);
    }
  }
`;

/**
 * Composed home styles including fadeIn animation.
 * Use this array in the component's static styles.
 */
export const homeStylesWithAnimations = [fadeInAnimation, homeStyles];

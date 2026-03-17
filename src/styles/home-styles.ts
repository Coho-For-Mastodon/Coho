import { css } from 'lit';
import { fadeInAnimation } from './animations';

/**
 * Styles for the app-home page component.
 * Extracted from app-home.ts to improve maintainability and reduce file size.
 */
export const homeStyles = css`
  #welcomeBar {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
  }

  app-timeline,
  app-bookmarks,
  app-notifications,
  app-favorites,
  app-bookmarks,
  search-page {
    margin-left: 0;
    margin-right: 0;
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

  /* Dark mode support for tabs */
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

  md-menu-item {
    color: white;
  }

  @media (prefers-color-scheme: light) {
    md-menu-item {
      color: black;
    }

    md-menu {
      background: rgb(235 235 235);
      backdrop-filter: none;
    }
  }

  #settings-profile-inner {
    background: rgba(128, 128, 128, 0.14);
    border-radius: var(--md-sys-shape-corner-small);
    padding: 10px;
    margin-top: 12px;

    display: flex;
    flex-direction: column;
    align-items: center;
  }

  #settings-profile-inner img {
    width: 4em;
    border-radius: var(--md-sys-shape-corner-circle);
  }

  #settings-profile-inner md-skeleton {
    display: block;
  }

  #settings-profile-inner h3 {
    margin-top: 0;
    margin-bottom: 0;
  }

  #no-replies {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #reply-drawer md-skeleton {
    height: 8em;
    width: 8em;
  }

  .img-preview {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 8em;
    margin-top: 10px;
    background: #00000040;
    padding: 6px;
    gap: 6px;

    border-radius: var(--md-sys-shape-corner-small);
  }

  .img-preview img {
    width: 8em;
    min-height: 6em;
    border-radius: var(--md-sys-shape-corner-small);

    margin-top: 6px;
  }

  #context-menu {
    z-index: 10000;
    width: 150px;
    background: #1b1a1a;
    border-radius: var(--md-sys-shape-corner-small);
    position: fixed;
    transform: scale(0.9);
    opacity: 0;
    transform-origin: top left;
    transition: transform, opacity;
    transition-duration: 0.12s;
    pointer-events: none;
  }

  right-click sl-menu-item::part(checked-icon) {
    width: 8px;
  }

  #context-menu sl-menu-item::part(checked-icon) {
    width: 8px;
  }

  #context-menu.visible {
    display: block;
    transform: scale(1);
    opacity: 1;
    pointer-events: auto;
  }

  .setting div {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .setting p {
    margin-top: 4px;
  }

  @media (prefers-color-scheme: light) {
    md-menu-item {
      --neutral-fill-stealth-hover: white;
    }
  }

  md-badge {
    cursor: pointer;
  }

  #reply-drawer {
    --size: 100vh;
  }

  #reply-drawer::part(footer) {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  #instanceInfo {
    border-radius: var(--md-sys-shape-corner-small);
    background: #0000001a;
    padding-left: 12px;
    padding-top: 1px;
    padding-right: 12px;
    margin-top: 2em;
  }

  #instanceInfo img {
    width: 160px;
  }

  md-toolbar {
    width: 100%;
    margin-top: 0;
    padding-top: 8px;
    background: transparent;
    margin-bottom: 6px;
    top: 0;
    padding-right: 10px;
    position: sticky;
    z-index: 10;
  }

  @media (prefers-color-scheme: dark) {
    md-toolbar {
      background: transparent;
    }
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

  #right-sidebar {
    position: sticky;
    top: 20px;
    height: calc(100vh - 40px);
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding-right: var(--layout-sidebar-padding, 16px);
  }

  .sidebar-card {
    background: transparent;
    border: 1px solid var(--md-sys-color-outline-variant);
    border-radius: var(--md-sys-shape-corner-large);
    padding: 16px;

    animation: fadeIn 0.3s ease-in-out;

    background: var(--md-sys-color-surface-container, #1e1e24);
    border: none;
  }

  .sidebar-card h3 {
    margin-top: 0;
    margin-bottom: 12px;
    font-size: 1.1rem;
  }

  .trending-item {
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    cursor: pointer;
  }

  .trending-item .tag {
    font-weight: bold;
    font-size: 1rem;
  }

  .trending-item .count {
    font-size: 0.85rem;
    color: var(--md-sys-color-on-surface-variant);
  }

  main.focus {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding-left: 10vw;
    padding-right: 10vw;
  }

  #settings-drawer label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: bold;
  }

  #profile-card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 8px;

    width: 100%;
  }

  #profile-card-content img,
  #profile-card-content md-skeleton#profile-avatar {
    height: 80px;
    width: 80px;
    border-radius: var(--md-sys-shape-corner-circle);
    border: 2px solid var(--md-sys-color-primary);
  }

  #profile-card-content h3 {
    margin: 0;
    font-size: 1.1rem;
  }

  #profile-card-content p {
    margin: 0;
    color: var(--md-sys-color-on-surface-variant);
    font-size: 0.9rem;
  }

  .profile-stats {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    justify-content: center;
    width: -webkit-fill-available;
  }

  .profile-stats md-badge {
    cursor: pointer;
    width: -webkit-fill-available;
  }

  #username-block {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: -webkit-fill-available;
  }

  sl-radio {
    padding: 8px;
    margin-top: 4px;
    background: #00000024;
    border-radius: var(--md-sys-shape-corner-extra-small);
  }

  sl-radio::part(control) {
    --toggle-size: 20px;
    height: 20px;
  }

  #replies-drawer ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  #replies-drawer #reply-post-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 11px;
  }

  #replies-drawer #reply-post-actions sl-input {
    flex: 2;
  }

  #profile-card-actions {
    margin-top: 22px;

    position: fixed;
    bottom: 24px;
    width: 20%;
  }

  #profile-card-actions md-button {
    width: 80%;
  }

  #profile img,
  #profile-avatar {
    height: var(--md-sys-size-avatar-large, 88px);
    width: var(--md-sys-size-avatar-large, 88px);
    border-radius: var(--md-sys-shape-corner-circle);

    border: solid var(--sl-color-primary-600)
      var(--md-sys-size-avatar-border-width, 4px);
  }

  #profile md-skeleton {
    display: block;
  }

  #profile md-skeleton#profile-avatar {
    height: var(--md-sys-size-avatar-large, 88px);
    width: var(--md-sys-size-avatar-large, 88px);
    border-radius: var(--md-sys-shape-corner-circle);

    border: solid var(--sl-color-primary-600)
      var(--md-sys-size-avatar-border-width, 4px);
  }

  #profile-top {
    margin-bottom: 2em;
  }

  #profile-top h3 {
    margin-bottom: 0;
    margin-top: 0;
  }

  #profile-top p {
    color: grey;
    font-size: var(--md-sys-typescale-body-medium-font-size);
  }

  md-dialog img {
    height: 160px;
    margin-top: 16px;
    background: #0e0e0e45;
    padding: 5px;
    border-radius: var(--md-sys-shape-corner-small);
  }

  #user-url {
    margin-top: 4px;
    font-size: var(--md-sys-typescale-body-small-font-size);
  }

  #welcomeCard,
  #infoCard {
    padding: 18px;
    padding-top: 0px;
  }

  sl-color-picker::part(base) {
    right: 91px;
    position: fixed;
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

  sl-card::part(footer) {
    display: flex;
    justify-content: flex-end;
  }

  sl-tab-panel {
    content-visibility: auto;
    contain: content;
  }

  #mobile-actions {
    position: fixed;
    bottom: 90px;
    right: 16px;
    display: none;
  }

  @media (min-width: 821px) and (max-width: 1030px) {
    #profile-card-actions md-button {
      width: 100%;
    }

    main {
      grid-template-columns: 1fr;
    }

    md-tabs {
      grid-column: 1;
    }

    #mobile-actions {
      display: none;
    }
  }

  @media (max-width: 820px) {
    #profile,
    #left-sidebar,
    #right-sidebar {
      display: none;
    }

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
    app-bookmarks,
    search-page {
      margin-left: initial;
      margin-right: initial;
      width: 100%;
      scrollbar-width: none;
    }

    md-toolbar {
      display: none;
    }

    #mobile-actions {
      display: flex;
      bottom: calc(env(safe-area-inset-bottom, 0px) + 86px);
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
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
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

  #focusModeButton {
    position: fixed;
    bottom: 18px;
    left: 12px;
  }

  @media (horizontal-viewport-segments: 2) {
    #welcomeBar {
      flex-direction: row;
      align-items: flex-start;
      justify-content: space-between;
    }

    #welcomeCard {
      margin-right: 64px;
    }
  }
`;

/**
 * Composed home styles including fadeIn animation.
 * Use this array in the component's static styles.
 */
export const homeStylesWithAnimations = [fadeInAnimation, homeStyles];

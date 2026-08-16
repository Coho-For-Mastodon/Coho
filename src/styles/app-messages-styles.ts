import { css } from 'lit';

/**
 * Styles for the app-messages component.
 */
export const appMessagesStyles = css`
  :host {
    display: block;
    height: 100%;
  }

  section {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding-top: calc(46px + env(safe-area-inset-top, 0px));
    box-sizing: border-box;
  }

  /* Page title bar */
  .title-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px 4px;
    max-width: 720px;
    margin: 0 auto;
    width: 100%;
    box-sizing: border-box;
  }

  .title-bar h1 {
    margin: 0;
    font-size: var(--md-sys-typescale-title-large-font-size, 22px);
    font-weight: 600;
  }

  .scroller {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 0 16px 80px;
  }

  .conversation-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    max-width: 720px;
    margin: 0 auto;
    padding: 8px 0;
  }

  /* Conversation card */
  .conversation-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 12px;
    border-radius: var(--md-sys-shape-corner-medium);
    cursor: pointer;
    transition: background 0.15s cubic-bezier(0.2, 0, 0, 1);
    position: relative;
  }

  .conversation-card:hover {
    background: color-mix(
      in srgb,
      var(--md-sys-color-on-surface, #ffffff) 6%,
      transparent
    );
  }

  .conversation-card:active {
    background: color-mix(
      in srgb,
      var(--md-sys-color-on-surface, #ffffff) 10%,
      transparent
    );
  }

  .avatar-stack {
    position: relative;
    flex-shrink: 0;
    width: 48px;
    height: 48px;
  }

  .avatar-stack img {
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-circle);
    object-fit: cover;
  }

  .avatar-stack.multi img:first-child {
    width: 36px;
    height: 36px;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 1;
    border: 2px solid var(--md-sys-color-surface, #1c1b1f);
  }

  .avatar-stack.multi img:nth-child(2) {
    width: 30px;
    height: 30px;
    position: absolute;
    bottom: 0;
    right: 0;
    z-index: 0;
  }

  .conversation-content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .display-names {
    flex: 1;
    min-width: 0;
    font-weight: 600;
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .timestamp {
    position: absolute;
    bottom: -4px;
    right: -4px;
    font-size: 9px;
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
    background: var(--md-sys-color-background, #1c1b1f);
    padding: 1px 4px;
    border-radius: var(--md-sys-shape-corner-small);
    line-height: 1.3;
    z-index: 2;
  }

  .preview {
    font-size: var(--md-sys-typescale-body-small-font-size, 12px);
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.4;
  }

  .unread-dot {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 10px;
    height: 10px;
    border-radius: var(--md-sys-shape-corner-circle);
    background: var(--md-sys-color-primary, #d0bcff);
    border: 2px solid var(--md-sys-color-background, #1c1b1f);
    z-index: 3;
  }

  .conversation-card.unread .display-names {
    color: var(--md-sys-color-primary, #d0bcff);
  }

  .conversation-card.unread .preview {
    color: var(--md-sys-color-on-surface, #e6e1e5);
    font-weight: 500;
  }

  .delete-btn {
    flex-shrink: 0;
    opacity: 0.5;
    transition: opacity 0.15s;
  }

  .conversation-card:hover .delete-btn {
    opacity: 1;
  }

  /* New-message dialog sizing to match post dialog */
  md-dialog::part(dialog) {
    min-width: 60vw;
    min-height: 70vh;
  }

  @media (min-width: 1100px) {
    md-dialog::part(dialog) {
      min-width: 50vw;
      min-height: 60vh;
    }

    .fab {
      max-width: 720px;
      margin: 0 auto;
      padding: 8px 0;
      display: flex;
      justify-content: end;
      position: absolute;
      /* top: 9vh; */
      left: 0;
      right: 0;
      bottom: 2em;
    }
  }

  @media (max-width: 820px) {
    md-dialog::part(dialog) {
      min-width: 100vw;
      min-height: 100vh;
    }
  }

  /* New-message dialog content */
  .new-message-body {
    display: flex;
    flex-direction: column;
    min-height: 300px;
    max-height: 70vh;
  }

  .search-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    border-bottom: 1px solid
      var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
  }

  .search-row label {
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
    flex-shrink: 0;
  }

  .search-row md-text-field {
    flex: 1;
  }

  .search-results {
    flex: 1;
    overflow-y: auto;
    padding: 8px 0;
  }

  .account-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    cursor: pointer;
    transition: background 0.12s;
  }

  .account-row:hover {
    background: color-mix(
      in srgb,
      var(--md-sys-color-on-surface, #ffffff) 6%,
      transparent
    );
  }

  .account-avatar {
    width: 40px;
    height: 40px;
    border-radius: var(--md-sys-shape-corner-circle);
    object-fit: cover;
    flex-shrink: 0;
  }

  .account-info {
    flex: 1;
    min-width: 0;
  }

  .account-display-name {
    font-weight: 600;
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .account-handle {
    font-size: var(--md-sys-typescale-body-small-font-size, 12px);
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .search-hint {
    padding: 32px 16px;
    text-align: center;
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
  }

  /* Empty state */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
    gap: 16px;
  }

  .empty-icon {
    width: 64px;
    height: 64px;
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
    opacity: 0.4;
  }

  .empty-title {
    font-size: var(--md-sys-typescale-title-medium-font-size, 16px);
    font-weight: 600;
  }

  .empty-subtitle {
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
    max-width: 300px;
  }

  /* Error state */
  .error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 64px 24px;
    text-align: center;
    gap: 12px;
  }

  .error-message {
    color: var(--md-sys-color-error, #ffb4ab);
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
  }

  /* FAB */
  .fab {
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 5;
  }

  /* Skeleton loading rows */
  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 12px;
  }

  .skeleton-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-circle);
    background: var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
    flex-shrink: 0;
    animation: skeletonPulse 1.5s ease-in-out infinite;
  }

  .skeleton-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .skeleton-line {
    height: 12px;
    border-radius: var(--md-sys-shape-corner-small);
    background: var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.08));
    animation: skeletonPulse 1.5s ease-in-out infinite;
  }

  .skeleton-line.short {
    width: 60%;
  }

  @keyframes skeletonPulse {
    0%,
    100% {
      opacity: 0.4;
    }
    50% {
      opacity: 1;
    }
  }

  .loading-more {
    display: flex;
    justify-content: center;
    padding: 16px;
  }

  .loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid
      var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
    border-top-color: var(--md-sys-color-primary, #d0bcff);
    border-radius: var(--md-sys-shape-corner-circle);
    animation: spin 0.8s linear infinite;
  }

  @media (prefers-color-scheme: light) {
    .conversation-card:hover,
    .account-row:hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #000000) 6%,
        transparent
      );
    }
  }
`;

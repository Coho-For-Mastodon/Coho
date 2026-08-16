import { css } from 'lit';

/**
 * Styles for the notifications component.
 */
export const notificationsStyles = css`
  :host {
    height: 91vh;
    display: flex;
    flex-direction: column;
    gap: 8px;

    contain: paint layout style;
    content-visibility: auto;
  }

  md-dialog#open-tweet-dialog {
    --md-dialog-max-width: 60vw;
    --md-dialog-max-height: 92vh;
  }

  md-segmented-button {
    margin-bottom: 16px;
  }

  .panel {
    display: none;
  }

  .panel.active {
    display: block;
  }

  @media (prefers-color-scheme: dark) {
    .notification-card {
      color: white;
    }
  }

  #notify-inner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  md-switch {
    font-size: var(--md-sys-typescale-body-medium-font-size);
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 0;
    list-style: none;
    margin-top: 0px;

    height: 87.5vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  ul::-webkit-scrollbar {
    display: none;
  }

  .scroller-fallback {
    display: block;
    padding: 0;
    list-style: none;
    margin-top: 0px;

    height: 87.5vh;
    overflow-y: scroll;
    overflow-x: hidden;
  }

  .scroller-fallback::-webkit-scrollbar {
    display: none;
  }

  .notification-wrapper {
    margin-bottom: 12px;
    width: 100%;
  }

  #load-more-indicator {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px;
    color: var(--md-sys-color-on-surface-variant, #888);
    font-size: 0.9em;
  }

  #load-more-indicator md-icon {
    animation: spin 1s linear infinite;
    width: 20px;
    height: 20px;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  #notify-actions md-icon-button {
    animation: fade-in 200ms ease-in;
  }

  #notify-actions {
    padding: 8px;
    border-radius: var(--md-sys-shape-corner-small);
    background: transparent;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  /* Notification Card Styles */
  .notification-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
    cursor: pointer;
    border-radius: var(--md-sys-shape-corner-medium);
    background: var(--md-sys-color-surface-container, #1e1e24);
    padding: 16px;
    transition: background 0.2s ease;
    position: relative;
    overflow: hidden;
  }

  .notification-card.dm-loading {
    pointer-events: none;
  }

  .dm-loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: rgba(0, 0, 0, 0.45);
    border-radius: var(--md-sys-shape-corner-medium);
    z-index: 1;
    animation: fade-in 150ms ease-out;
  }

  .dm-loading-spinner {
    width: 22px;
    height: 22px;
    border: 3px solid rgba(255, 255, 255, 0.25);
    border-top-color: var(--md-sys-color-primary, #d0bcff);
    border-radius: var(--md-sys-shape-corner-circle);
    animation: spin 0.8s linear infinite;
  }

  .dm-loading-overlay span {
    color: #fff;
    font-size: var(--md-sys-typescale-body-medium-font-size, 0.9em);
    font-weight: 500;
  }

  .notification-card:hover {
    background: var(
      --sl-panel-background-color-hover,
      rgba(255, 255, 255, 0.08)
    );
  }

  /* Header with notification type indicator */
  .notification-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .notification-icon {
    width: 32px;
    height: 32px;
    border-radius: var(--md-sys-shape-corner-circle);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .notification-icon svg {
    width: 18px;
    height: 18px;
  }

  .notification-icon.favourite {
    background: linear-gradient(135deg, #ff6b6b, #ee5253);
    color: white;
  }

  .notification-icon.reblog {
    background: linear-gradient(135deg, #00d2d3, #01a3a4);
    color: white;
  }

  .notification-icon.mention {
    background: linear-gradient(135deg, #5f27cd, #341f97);
    color: white;
  }

  .notification-icon.follow {
    background: linear-gradient(135deg, #1dd1a1, #10ac84);
    color: white;
  }

  .notification-icon.update {
    background: linear-gradient(135deg, #feca57, #ff9f43);
    color: white;
  }

  .notification-meta {
    flex: 1;
    min-width: 0;
  }

  .notification-meta-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .notification-user {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .notification-action {
    color: var(--md-sys-color-on-surface-variant, #888);
    font-size: 0.9em;
  }

  .notification-time {
    color: var(--md-sys-color-on-surface-variant, #666);
    font-size: 0.8em;
    margin-top: 2px;
  }

  /* User avatar for follow notifications */
  .notification-avatar {
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-circle);
    object-fit: cover;
    border: 2px solid var(--sl-color-primary-600);
    flex-shrink: 0;
  }

  /* Post preview */
  .post-preview {
    background: rgba(0, 0, 0, 0.15);
    border-radius: var(--md-sys-shape-corner-small);
    padding: 12px;
    margin-top: 4px;
    border-left: 3px solid var(--sl-color-primary-600);
  }

  @media (prefers-color-scheme: light) {
    .post-preview {
      background: rgba(0, 0, 0, 0.05);
    }
  }

  .post-preview-content {
    font-size: 0.95em;
    line-height: 1.5;
    word-break: break-word;
  }

  .post-preview-content p {
    margin: 0;
  }

  .post-preview-content a {
    color: var(--sl-color-primary-600);
  }

  .post-preview-media {
    display: flex;
    gap: 8px;
    margin-top: 10px;
    overflow-x: auto;
  }

  .post-preview-media img {
    max-height: 120px;
    border-radius: var(--md-sys-shape-corner-small);
    object-fit: cover;
  }

  /* === Link card: compact horizontal (no image) === */
  .link-card {
    display: flex;
    align-items: stretch;
    background: #ffffff0d;
    border-radius: var(--md-sys-shape-corner-small);
    overflow: hidden;
    margin-top: 10px;
    cursor: pointer;
    height: auto;
    gap: 10px;
    border: 1px solid
      color-mix(
        in srgb,
        var(--md-sys-color-outline-variant, #2b2930) 60%,
        transparent
      );
  }

  .link-card:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  .link-card h4 {
    margin-bottom: 4px;
    margin-top: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 18px;
  }

  .link-card-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 60px;
    padding: 12px;
    background: rgba(255, 255, 255, 0.04);
  }

  .link-card-icon img {
    width: 24px;
    height: 24px;
    opacity: 0.6;
    background: transparent;
  }

  .link-card-content {
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 10px 12px;
    flex: 1;
    min-width: 0;
  }

  .link-card p {
    margin: 0;
    font-size: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    color: var(--md-sys-color-on-surface-variant);
  }

  .link-card-provider {
    font-size: 11px;
    color: var(--md-sys-color-on-surface-variant, #938f99);
    margin-top: 4px;
  }

  /* === Link card: large vertical (with image) === */
  .link-card--large {
    flex-direction: column;
    gap: 0;
  }

  .link-card--large .link-card-hero {
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: cover;
    border-radius: 0;
    padding: 0;
    min-width: unset;
    display: block;
    background: rgba(255, 255, 255, 0.04);
  }

  .link-card--large .link-card-content {
    padding: 12px 14px;
  }

  .link-card--large h4 {
    white-space: normal;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  @media (prefers-color-scheme: light) {
    .link-card {
      background: rgba(0, 0, 0, 0.05);
      border-color: color-mix(
        in srgb,
        var(--md-sys-color-outline-variant, #cac4d0) 60%,
        transparent
      );
    }

    .link-card:hover {
      background: rgba(0, 0, 0, 0.08);
    }

    .link-card-icon {
      background: rgba(0, 0, 0, 0.04);
    }
  }

  /* Follow notification expanded view */
  .follow-card {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .follow-user-info {
    display: flex;
    gap: 14px;
    align-items: flex-start;
  }

  .follow-avatar {
    width: 56px;
    height: 56px;
    border-radius: var(--md-sys-shape-corner-circle);
    object-fit: cover;
    border: 2px solid var(--sl-color-primary-600);
    flex-shrink: 0;
    cursor: pointer;
  }

  .follow-details {
    flex: 1;
    min-width: 0;
  }

  .follow-name {
    font-weight: 600;
    font-size: 1.1em;
    margin: 0 0 2px 0;
    cursor: pointer;
  }

  .follow-name:hover {
    text-decoration: underline;
  }

  .follow-handle {
    color: var(--md-sys-color-on-surface-variant, #888);
    font-size: 0.9em;
    margin: 0 0 8px 0;
  }

  .follow-bio {
    font-size: 0.9em;
    line-height: 1.4;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .follow-bio p {
    margin: 0;
  }

  .follow-stats {
    display: flex;
    gap: 16px;
    margin-top: 8px;
    font-size: 0.85em;
  }

  .follow-stat {
    color: var(--md-sys-color-on-surface-variant, #888);
  }

  .follow-stat strong {
    color: var(--md-sys-color-on-surface, white);
  }

  @media (prefers-color-scheme: light) {
    .follow-stat strong {
      color: var(--md-sys-color-on-surface, black);
    }
  }

  .follow-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .follow-back-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  /* Empty state */
  #no {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: 1.4em;
    margin-top: 40px;
    padding: 20px;
  }

  #no img {
    height: 300px;
    opacity: 0.8;
  }

  #no p {
    color: var(--md-sys-color-on-surface-variant, #888);
  }

  @media (max-width: 820px) {
    .notification-card {
      border-radius: var(--md-sys-shape-corner-small);
      background: transparent;
      padding: 12px 0;
    }

    ul {
      gap: 10px;
      padding: 0 4px;
    }
  }
`;

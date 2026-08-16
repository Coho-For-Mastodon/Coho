import { css } from 'lit';

/**
 * Styles for the timeline component.
 */
export const timelineStyles = css`
  :host {
    display: block;
    height: 100%;
  }

  md-dialog::part(base) {
    z-index: 99999;
  }

  #mainList li {
    width: 100%;
  }

  timeline-item {
    margin-bottom: 16px;
  }

  .line-divider {
    height: 1px;
    /* width: 100%; */
    background: #4a4a4a;
    margin: 8px;
    display: none;
  }

  #list-actions {
    display: none;
    margin-bottom: 12px;

    background: var(--sl-panel-background-color);
    padding: 8px;
    border-radius: var(--md-sys-shape-corner-extra-small);

    align-items: center;
    justify-content: space-between;
  }

  md-button {
    border: none;
  }

  #timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    gap: 12px;
  }

  #timeline-header md-select {
    flex: 1;
    max-width: 300px;
  }

  @media (prefers-color-scheme: dark) {
    md-button::part(control) {
      --neutral-fill-rest: #242428;
      --netural-fill-stealth-active: #242428;
      color: white;
      border: none;
    }
  }

  #learn-more-header {
    padding-top: 0;
    margin-top: 0;
  }

  .scroller-fallback {
    display: block;
    border-radius: var(--md-sys-shape-corner-small);
    margin: 0;
    padding: 0;
    list-style: none;

    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    overscroll-behavior-y: contain;
  }

  .timeline-list-item {
    margin-bottom: 0px;
    width: 100%;
    max-width: 100%;
    overflow-x: hidden;
    list-style: none;
  }

  #load-more {
    margin: 16px auto;
    display: block;
  }

  sl-card {
    --padding: 10px;
  }

  li {
    animation-name: fadein;
    animation-duration: 0.3s;
  }

  .header-block {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .header-block img {
    height: 62px;
    border-radius: var(--md-sys-shape-corner-circle);
  }

  .header-block h4 {
    margin-bottom: 0;
  }

  .actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
  }

  .fake md-skeleton {
    height: 302px;
  }

  .fake {
    margin-bottom: 8px;
    animation-name: fadein;
    animation-duration: 0.3s;
  }

  #analyze ul {
    max-height: 200px;
    max-width: 390px;
    height: initial;
  }

  #analyze ul li {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
    background: var(--primary-color);
    border-radius: var(--md-sys-shape-corner-small);
    padding: 8px;
  }

  #analyze::part(panel) {
    --width: 90vw;
    height: 90vh;
  }

  #analyze::part(body) {
    display: grid;
    grid-template-columns: 29% 69%;
    gap: 16px;
  }

  #analyze timeline-item::part(image) {
    height: 200px;
  }

  #analyze timeline-item {
    overflow: hidden;
  }

  ul {
    overscroll-behavior-y: contain;
    position: relative;
  }

  #refresh-indicator {
    height: 0;
    overflow: hidden;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    transition: height 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    flex-shrink: 0;
    z-index: 100;
    position: relative;
  }

  #refresh-indicator .indicator-container {
    width: 48px;
    height: 48px;
    border-radius: var(--md-sys-shape-corner-circle);
    background: var(
      --md-sys-color-surface-container-highest,
      rgba(128, 128, 128, 0.15)
    );
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transform: scale(0.5);
    transition:
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
      opacity 0.3s ease;
  }

  #refresh-indicator md-icon {
    width: 24px;
    height: 24px;
    font-size: 24px;
    color: var(--md-sys-color-primary);
  }

  #refresh-indicator.refreshing {
    height: 60px;
  }

  #refresh-indicator.refreshing .indicator-container {
    transform: scale(1);
    opacity: 1;
  }

  #refresh-indicator.refreshing md-icon {
    animation: spin 1.4s ease-in-out infinite;
  }

  @media (max-width: 820px) {
    #timeline-header md-select {
      max-width: 100%;
    }

    #refresh-manual-button {
      display: none;
    }

    .line-divider {
      display: block;
    }
  }

  @keyframes fadein {
    0% {
      opacity: 0;
    }
    100% {
      opacity: 1;
    }
  }

  .timeline-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 20px;
    font-weight: 600;
    cursor: pointer;
    padding: 4px 8px;
    margin-left: -8px;
    border-radius: var(--md-sys-shape-corner-small);
    transition: background-color 0.2s;
    user-select: none;
    color: var(--md-sys-color-on-surface);
  }

  .timeline-title:hover {
    background: var(
      --md-sys-color-surface-container-high,
      rgba(128, 128, 128, 0.1)
    );
  }

  .timeline-title svg {
    width: 24px;
    height: 24px;
    fill: var(--md-sys-color-on-surface-variant);
  }

  md-menu {
    min-width: 200px;
  }

  #load-more-indicator {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 24px 16px;
    gap: 8px;
    color: var(--md-sys-color-on-surface-variant, #666);
    font-size: 14px;
  }

  #load-more-indicator md-icon {
    width: 20px;
    height: 20px;
    animation: spin 1s linear infinite;
    color: var(--md-sys-color-primary);
  }

  #new-posts-button {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    justify-content: center;
    padding: 8px 0;
    animation: slideDown 0.3s ease-out;
  }

  #new-posts-button md-button {
    --md-sys-color-primary: var(--md-sys-color-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  @keyframes slideDown {
    from {
      transform: translateY(-100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;

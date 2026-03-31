import { css } from 'lit';

/**
 * Shared styles for user-list pages (followers, following, blocked, muted).
 * Provides layout, skeleton placeholders, empty state, and responsive rules.
 */
export const userListStyles = css`
  :host {
    display: block;
    overflow-y: scroll;
    height: 100vh;
  }

  main {
    padding-top: calc(46px + env(safe-area-inset-top, 0px));
    max-width: var(--layout-max-width, 1200px);
    margin: 0 auto;
  }

  ul {
    display: flex;
    flex-direction: column;
    gap: 14px;
    margin: 0;
    padding: 0;
    list-style: none;
    height: 81vh;
    overflow-y: scroll;
    overflow-x: hidden;
    padding-left: 6em;
    padding-right: 6em;
  }

  h2 {
    padding-left: 4em;
    margin-bottom: 0;
  }

  ul li {
    background: var(--sl-color-gray-50);
    border-radius: var(--md-sys-shape-corner-small);
    padding: 10px;
  }

  .skeleton-row {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .skeleton-lines {
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  ul li.empty-state {
    background: transparent;
    text-align: center;
    cursor: default;
    color: var(--md-sys-color-on-surface-variant, var(--sl-color-gray-500));
  }

  @media (max-width: 820px) {
    ul {
      padding: 12px;
    }

    h2 {
      padding: 12px;
    }
  }

  @media (prefers-color-scheme: light) {
    ul li {
      color: black;
    }
  }

  @keyframes slideUp {
    from {
      transform: translateY(30%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slideInFromLeft {
    from {
      transform: translateX(-30%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

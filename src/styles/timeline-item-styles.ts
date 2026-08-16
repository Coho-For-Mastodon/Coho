import { css } from 'lit';

/**
 * Styles for the timeline-item component.
 */
export const timelineItemStyles = css`
  :host {
    display: block;

    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;

    margin-bottom: 0;
    -webkit-tap-highlight-color: transparent;
    outline: none;
  }

  .thread-connector-bar {
    width: 100%;
    background: var(--md-sys-color-primary);
    height: 8px;
    border-radius: 8px;
    margin-left: 20px;
  }

  :host([focused]) md-card {
    outline: 2px solid var(--md-sys-color-primary, #6750a4);
    outline-offset: 2px;
  }

  :host(:focus-visible) md-card {
    outline: 2px solid var(--md-sys-color-primary, #6750a4);
    outline-offset: 2px;
  }

  * {
    box-sizing: border-box;
  }

  md-card {
    content-visibility: auto;
    contain-intrinsic-size: auto 400px;

    animation-name: slideUp;
    animation-duration: 0.3s;
    animation-fill-mode: forwards;

    cursor: pointer;

    border-radius: var(--md-sys-shape-corner-medium);
    overflow: hidden;

    width: auto;

    overflow-x: hidden;
  }

  md-card::part(base) {
    transition:
      background 0.2s ease,
      border-color 0.2s ease;
    padding-left: 10px;
    padding-right: 10px;
    padding-top: 0px;
    background: var(--md-sys-color-surface-container, #1e1e24);
  }

  :host(:hover) md-card::part(base) {
    border-color: var(--md-sys-color-outline-variant, #2b2930);
  }

  image-grid {
    margin-left: -12px;
    margin-right: -12px;
    width: calc(100% + 24px);
    display: block;
    margin-top: 12px;
    margin-bottom: 12px;
  }

  md-card::part(header) {
    padding: 0;
    padding-top: 12px;
  }

  md-card::part(body) {
    padding: 12px;
    padding-top: 8px;
  }

  md-card::part(footer) {
    padding-left: 0;
    padding-bottom: 12px;
  }

  .boost-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    margin: -10px -10px 10px -10px;
    background: transparent;
    border: none;
    outline: none;
    border-radius: var(--md-sys-shape-corner-medium)
      var(--md-sys-shape-corner-medium) 0 0;
    font-size: var(--md-sys-typescale-body-small-font-size);
    color: var(--md-sys-color-on-surface-variant, #c4c4c4);
    cursor: pointer;
  }

  .boost-indicator:hover {
    background: var(--md-sys-color-surface-container-highest, #353539);
  }

  .boost-indicator md-icon {
    color: var(--md-sys-color-primary, var(--sl-color-primary-600));
    font-size: 16px;
  }

  .boost-indicator img {
    width: 20px;
    height: 20px;
    border-radius: var(--md-sys-shape-corner-circle);
    border: 1px solid var(--md-sys-color-outline-variant, #444);
  }

  .boost-indicator .booster-name {
    font-weight: 500;
    color: var(--md-sys-color-on-surface, #fff);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 150px;
  }

  .boosted-by {
    flex: 2;
  }

  .boosted-by span {
    font-size: var(--md-sys-typescale-body-small-font-size);

    margin-bottom: 6px;
    display: block;
  }

  .sensitive {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 10px;
    padding: 24px 20px 20px;
    border-radius: var(--md-sys-shape-corner-large, 16px);
    background: var(--md-sys-color-surface-container-high, rgb(36 36 40));
    border: 1px solid
      color-mix(
        in srgb,
        var(--md-sys-color-outline-variant, #49454f) 45%,
        transparent
      );
  }

  .sensitive-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: var(
      --md-sys-color-secondary-container,
      rgba(255, 255, 255, 0.08)
    );
    color: var(--md-sys-color-on-secondary-container, #cac4d0);
    margin-bottom: 2px;
  }

  .sensitive-icon md-icon {
    font-size: 22px;
    width: 22px;
    height: 22px;
  }

  .sensitive-title {
    font-weight: 500;
    font-size: var(--md-sys-typescale-title-medium-font-size, 16px);
    line-height: 1.25;
    color: var(--md-sys-color-on-surface, #e6e1e5);
  }

  .sensitive-text {
    margin: 0;
    max-width: 340px;
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
    line-height: 1.4;
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
  }

  .sensitive-text--muted {
    font-style: italic;
    opacity: 0.75;
  }

  .sensitive-action {
    margin-top: 6px;
  }

  /* Legacy fallbacks for any remaining markup */
  .sensitive > span {
    font-weight: 500;
    font-size: var(--md-sys-typescale-title-medium-font-size, 16px);
    color: var(--md-sys-color-on-surface, #e6e1e5);
  }

  .sensitive > p {
    margin: 0;
    max-width: 340px;
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
  }

  .filter-warning {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 16px 22px;
    background: var(--md-sys-color-surface-container, rgb(32, 32, 35));
    border-radius: var(--md-sys-shape-corner-small);
    color: var(--md-sys-color-on-surface-variant, #cac4d0);
    font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
    cursor: default;
  }

  .filter-warning-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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

    .sensitive {
      background: var(--md-sys-color-surface-container-high, rgb(243 243 247));
      border-color: color-mix(
        in srgb,
        var(--md-sys-color-outline-variant, #cac4d0) 60%,
        transparent
      );
    }

    .sensitive-icon {
      background: var(--md-sys-color-secondary-container, rgba(0, 0, 0, 0.06));
      color: var(--md-sys-color-on-secondary-container, #1d1b20);
    }
  }

  .header-actions-block {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .header-actions-block div {
    display: flex;
    align-items: center;
  }

  .header-actions-block span {
    color: #878792;
    font-size: var(--md-sys-typescale-body-medium-font-size);
  }

  .edited-indicator {
    display: inline-block;
    font-size: var(--md-sys-typescale-label-small-font-size, 11px);
    color: var(--md-sys-color-on-surface-variant, #878792);
    margin-top: 4px;
    background: none;
    border: none;
    padding: 0;
    font-family: inherit;
    cursor: pointer;
  }

  .edited-indicator:hover {
    text-decoration: underline;
    color: var(--md-sys-color-primary, var(--sl-color-primary-600));
  }

  img[data-src] {
    opacity: 0;
  }

  img {
    opacity: 1;
    transition: opacity 0.3s ease-in-out;
  }

  .status-link-card {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 10px;
    background: rgb(255 255 255 / 11%);
    border-radius: var(--md-sys-shape-corner-small);
    padding: 10px;
  }

  .status-link-card a {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 10px;
  }

  .status-link-card img {
    width: 100%;
    max-width: 300px;
    border-radius: var(--md-sys-shape-corner-small);
    height: initial;
  }

  .status-link-card__content p {
    margin-top: 6px;

    white-space: nowrap;
    max-width: 40vw;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-link-card__title {
    padding: 0;
    margin: 0;
  }

  md-card a {
    color: var(--sl-color-secondary-700);
  }

  md-card img {
    object-fit: cover;
    border-radius: var(--md-sys-shape-corner-small)
      var(--md-sys-shape-corner-small) 0 0;
  }

  .header-block {
    display: flex;
    align-items: center;
    gap: 14px;
    justify-content: space-between;
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
    justify-content: flex-start;
    gap: 4px;
  }

  .actions md-button {
    background: transparent;
    border: none;
    font-size: 1.2em;
    color: grey;
  }

  img {
    background: #ffffff4f;
  }

  @media (prefers-color-scheme: dark) {
    img {
      background: rgb(24 25 31);
    }
  }

  md-card::part(footer) {
    border-top: none;
  }

  .replyCard {
    margin-left: 15px;
    width: calc(100% - 15px);
    max-width: calc(100% - 15px);
    min-width: 0;
  }

  #reply-to {
    height: 33px;
    display: flex;
    justify-content: flex-start;
    align-items: center;
    color: var(--primary-color);
    margin-top: 0px;
    margin-bottom: 0px;

    font-size: var(--md-sys-typescale-body-medium-font-size);
    gap: 8px;
  }

  .thread-continuation {
    margin-left: 16px;
    padding-left: 20px;
    border-left: 3px solid var(--sl-color-primary-600);
    margin-top: 8px;
    min-width: 0;
  }

  .thread-continuation md-card {
    margin-bottom: 8px;
    min-width: 0;
  }

  /* Ensure content in cards doesn't overflow */
  md-card {
    min-width: 0;
    max-width: 100%;
  }

  md-card div {
    word-wrap: break-word;
    overflow-wrap: break-word;
    word-break: break-word;
    min-width: 0;
  }

  /* === Connected thread card styles === */

  /* Connector bar between connected cards — sits in normal flow */

  .thread-connector-line {
    width: 2px;
    min-height: 24px;
    /* 11px bar padding-left + 30px = 41px from card left edge,
           matching avatar center (16px card padding + 25px = half of 50px avatar) */
    margin-left: 30px;
    background: var(--md-sys-color-outline, #938f99);
    border-radius: 1px;
    flex-shrink: 0;
  }

  /* Connected thread cards: radius is handled inside md-card via :host([connected-top/bottom]) */

  .thread-continuation-card {
    cursor: pointer;
  }

  .thread-show-more {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px 16px;
    color: var(--md-sys-color-on-primary-container, #fff);
    font-size: var(--md-sys-typescale-label-large-font-size, 14px);
    font-weight: 600;
    letter-spacing: 0.02em;
    cursor: pointer;
    background: color-mix(
      in srgb,
      var(--md-sys-color-primary, #6750a4) 18%,
      var(--md-sys-color-surface-container, #1e1e24)
    );
    border: 1px solid
      color-mix(in srgb, var(--md-sys-color-primary, #6750a4) 40%, transparent);
    border-top: none;
    border-radius: 0 0 var(--md-sys-shape-corner-medium)
      var(--md-sys-shape-corner-medium);
    transition: background 0.15s ease;
  }

  .thread-show-more:hover {
    background: color-mix(
      in srgb,
      var(--md-sys-color-primary, #6750a4) 28%,
      var(--md-sys-color-surface-container, #1e1e24)
    );
  }

  .thread-line {
    width: 3px;
    background: var(--sl-color-primary-600);
    margin-left: 8px;
    height: 16px;
  }

  @media (prefers-color-scheme: light) {
    .thread-show-more {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary, #6750a4) 12%,
        var(--md-sys-color-surface-container, #f3f3f3)
      );
      color: var(--md-sys-color-primary, #6750a4);
      border-color: color-mix(
        in srgb,
        var(--md-sys-color-primary, #6750a4) 30%,
        transparent
      );
    }

    .thread-show-more:hover {
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary, #6750a4) 22%,
        var(--md-sys-color-surface-container, #f3f3f3)
      );
    }
  }

  @media (max-width: 820px) {
    .timeline-item {
      border-radius: var(--md-sys-shape-corner-none);
    }

    .actions {
      width: 100%;
    }

    .boost-indicator .booster-name {
      max-width: 100px;
    }

    md-card::part(footer) {
      padding-left: 12px;
      padding-bottom: 12px;
    }

    md-card::part(base) {
      padding-left: 6px;
      padding-right: 6px;
      background: transparent;
    }
  }

  @media (prefers-color-scheme: light) {
    #reply-to {
      color: black;
    }

    .boost-indicator {
      color: var(--md-sys-color-on-surface-variant, #5a5a5a);
    }

    .boost-indicator:hover {
      background: var(--md-sys-color-surface-container-highest, #dcdce0);
    }

    .boost-indicator .booster-name {
      color: var(--md-sys-color-on-surface, #1c1c1c);
    }
  }

  @keyframes slideUp {
    0% {
      transform: translateY(30px);
      opacity: 0;
    }
    100% {
      transform: translateY(0);
      opacity: 1;
    }
  }

  .quote-placeholder {
    padding: 12px 16px;
    font-style: italic;
    color: var(--md-sys-color-on-surface-variant, #938f99);
    font-size: 0.875rem;
  }

  /* Hide Mastodon fallback "RE:" inline quote links */
  .quote-inline {
    display: none !important;
  }

  /* Extracted from inline styles in timeline-renderers.ts */
  .link-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
  }

  .button-reset {
    background: none;
    border: none;
    padding: 0;
    font: inherit;
    color: inherit;
    cursor: pointer;
    width: 100%;
  }
`;

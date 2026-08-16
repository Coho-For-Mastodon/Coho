import { css } from 'lit';

/**
 * Styles for the app-profile page component.
 */
export const profileStyles = css`
  :host {
    display: block;
    overflow-y: auto;
    height: 100vh;
    scroll-timeline: --page-scroll block;
  }

  * {
    box-sizing: border-box;
  }

  md-dialog::part(base) {
    z-index: 99999;
  }

  a {
    color: var(--md-sys-color-primary);
    text-decoration: none;
  }

  a:hover {
    text-decoration: underline;
  }

  /* Banner section with scroll-driven parallax */
  #banner {
    width: 100%;
    height: 200px;
    background: linear-gradient(
      135deg,
      var(--md-sys-color-surface-container-low) 0%,
      var(--md-sys-color-surface-container) 50%,
      var(--md-sys-color-surface-container-high) 100%
    );
    background-size: cover;
    background-position: center;
    position: relative;
    margin-top: calc(56px + env(safe-area-inset-top, 0px));
    overflow: hidden;
    view-timeline-name: --banner-timeline;
    view-timeline-axis: block;
  }

  .skeleton-overlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: block;
  }

  #banner-img {
    width: 100%;
    height: 120%;
    object-fit: cover;
    object-position: center;
    animation: banner-parallax linear both;
    animation-timeline: --page-scroll;
    animation-range: 0px 300px;
    transform-origin: center top;
  }

  @keyframes banner-parallax {
    from {
      transform: translateY(0) scale(1);
      filter: brightness(1);
    }
    to {
      transform: translateY(-15%) scale(1.05);
      filter: brightness(0.85);
    }
  }

  #banner-skeleton {
    width: 100%;
    height: 100%;
  }

  /* Profile header section */
  #profile-header {
    position: relative;
    padding: 0 16px;
    max-width: 600px;
    margin: 0 auto;
  }

  #avatar-container {
    position: absolute;
    top: -64px;
    left: 16px;
    z-index: 10;
  }

  #avatar-stack {
    position: relative;
    width: 128px;
    height: 128px;
  }

  #avatar {
    width: 100%;
    height: 100%;
    border-radius: var(--md-sys-shape-corner-circle);
    border: 4px solid
      var(--md-sys-color-surface, var(--md-sys-color-background));
    object-fit: cover;
    background: var(--md-sys-color-surface, var(--md-sys-color-background));
    animation: avatar-scale linear both;
    animation-timeline: --page-scroll;
    animation-range: 0px 250px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    transition: box-shadow 0.3s ease;
  }

  #avatar:hover {
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25);
  }

  @keyframes avatar-scale {
    0% {
      transform: scale(1) translateY(0);
    }
    100% {
      transform: scale(0.85) translateY(-8px);
    }
  }

  #avatar-skeleton {
    width: 100%;
    height: 100%;
    border-radius: var(--md-sys-shape-corner-circle);
    border: 4px solid
      var(--md-sys-color-surface, var(--md-sys-color-background));
  }

  /* Actions row (follow button, etc.) */
  #actions-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 12px 0;
    gap: 8px;
    min-height: 68px;
  }

  #actions-skeleton {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  #actions-skeleton md-skeleton.action-button {
    width: 120px;
    height: 40px;
  }

  #actions-skeleton md-skeleton.action-icon {
    width: 40px;
    height: 40px;
  }

  #actions-row md-button {
    font-weight: 700;
    min-width: 100px;
    animation: fadeIn 0.2s ease-in;
  }

  /* Profile info */
  #profile-info {
    padding: 0 0 16px 0;
    margin-top: 1.4em;
  }

  #display-name {
    font-size: 20px;
    font-weight: 800;
    margin: 0;
    color: var(--md-sys-color-on-surface);
    line-height: 1.2;
  }

  #display-name-skeleton {
    height: 24px;
    width: 180px;
    margin-bottom: 4px;
  }

  #handle {
    font-size: 15px;
    color: var(--md-sys-color-on-surface-variant);
    margin: 2px 0 12px 0;
  }

  #handle-skeleton {
    height: 18px;
    width: 140px;
  }

  /* Media Grid Styles */
  .media-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2px;
    padding-bottom: 20px;
    min-height: 20vh;
  }

  /* New CSS Grid Masonry (Grid Lanes) */
  @supports (display: grid-lanes) {
    .media-grid {
      display: grid-lanes;
      /* Reuse existing grid-template-columns */
    }
  }

  /* Chromium Grid Masonry */
  @supports (display: masonry) {
    .media-grid {
      display: masonry;
      /* Reuse existing grid-template-columns */
    }
  }

  .media-item {
    position: relative;
    cursor: pointer;
    width: 100%;
    overflow: hidden;
  }

  .media-item img {
    width: 100%;
    height: 100%;
    display: block;
    transition: transform 0.2s;
    object-fit: cover;

    /* Fallback: Square tiles for standard grid */
    aspect-ratio: 1;
  }

  /* Allow natural height in masonry (grid-lanes) mode */
  @supports (display: grid-lanes) {
    .media-item img {
      aspect-ratio: auto;
      height: auto;
    }
  }

  /* Allow natural height in masonry (Chromium) mode */
  @supports (display: masonry) {
    .media-item img {
      aspect-ratio: auto;
      height: auto;
    }
  }

  .media-item:hover img {
    transform: scale(1.05);
    filter: brightness(0.9);
  }

  .media-indicator {
    position: absolute;
    top: 6px;
    right: 6px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    border-radius: var(--md-sys-shape-corner-extra-small);
    padding: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  #bio {
    font-size: 15px;
    line-height: 1.4;
    color: var(--md-sys-color-on-surface);
    margin: 12px 0;
    word-wrap: break-word;
  }

  #bio a {
    color: var(--md-sys-color-primary);
  }

  #bio-skeleton {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin: 12px 0;
  }

  #bio-skeleton md-skeleton {
    height: 16px;
  }

  #bio-skeleton md-skeleton:first-child {
    width: 100%;
  }

  #bio-skeleton md-skeleton:nth-child(2) {
    width: 90%;
  }

  #bio-skeleton md-skeleton:last-child {
    width: 60%;
  }

  /* Stats row */
  #stats-row {
    display: flex;
    gap: 20px;
    margin: 12px 0;
  }

  #stats-skeleton {
    display: flex;
    gap: 12px;
    margin: 12px 0;
    align-items: center;
  }

  #stats-skeleton md-skeleton {
    height: 18px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    transition: opacity 0.15s ease;
  }

  .stat:hover {
    opacity: 0.8;
  }

  .stat-count {
    font-weight: 700;
    font-size: 14px;
    color: var(--md-sys-color-on-surface);
  }

  .stat-label {
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
  }

  /* Mutuals badge */
  #mutuals-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--md-sys-color-primary);
    color: var(--md-sys-color-on-primary);
    padding: 4px 10px;
    border-radius: var(--md-sys-shape-corner-large);
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  /* Familiar followers */
  #familiar-followers {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 8px 0 4px;
    animation: fadeIn 0.3s ease-out;
  }

  .familiar-avatars {
    display: flex;
    flex-shrink: 0;
  }

  .familiar-avatar {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 2px solid var(--md-sys-color-surface);
    object-fit: cover;
    cursor: pointer;
    transition: transform 0.15s ease;
  }

  .familiar-avatar:not(:first-child) {
    margin-left: -8px;
  }

  .familiar-avatar:hover {
    transform: scale(1.15);
    z-index: 1;
  }

  .familiar-text {
    font-size: 13px;
    line-height: 1.3;
    color: var(--md-sys-color-on-surface-variant);
  }

  .familiar-name {
    color: var(--md-sys-color-primary);
    text-decoration: none;
    font-weight: 600;
  }

  .familiar-name:hover {
    text-decoration: underline;
  }

  /* Fields section */
  #fields {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
  }

  #fields-skeleton {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--md-sys-color-outline-variant);
  }

  .field-skeleton-row {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .field-skeleton-row md-skeleton.field-name {
    width: 120px;
    height: 14px;
  }

  .field-skeleton-row md-skeleton.field-value {
    width: 85%;
    height: 18px;
  }

  .field-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .field-name {
    font-size: 13px;
    color: var(--md-sys-color-on-surface-variant);
    font-weight: 500;
  }

  .field-value {
    font-size: 15px;
    color: var(--md-sys-color-on-surface);
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .field-value a {
    color: var(--md-sys-color-primary);
    text-decoration: none;
  }

  .field-value a:hover {
    text-decoration: underline;
  }

  #fields img {
    height: 18px;
    vertical-align: middle;
  }

  /* Tabs section */
  #tabs-container {
    border-top: 1px solid var(--md-sys-color-outline-variant);
    max-width: 600px;
    margin: 0 auto;
    padding: 0 16px;
    padding-top: 16px !important;

    margin-top: 1em;
    margin-bottom: 2em;
  }

  md-segmented-button {
    width: 100%;
    margin: 0;
  }

  #tabs-skeleton {
    display: flex;
    gap: 10px;
    width: 100%;
  }

  #tabs-skeleton md-skeleton {
    height: 40px;
    flex: 1;
  }

  /* Posts list */
  #posts-container {
    max-width: 600px;
    margin: 0 auto;
    padding: 0 16px;
  }

  #pinned-section {
    margin-bottom: 20px;
    animation: fadeIn 0.3s ease-out;
  }

  #pinned-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--md-sys-color-on-surface-variant);
    margin-bottom: 12px;
  }

  #pinned-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  #pinned-section md-divider {
    margin-top: 16px;
    opacity: 0.5;
  }

  .scroller-fallback {
    display: block;
    contain: none;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .post-item {
    padding-bottom: 16px;
    width: 100%;
    list-style: none;
  }

  ul {
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    list-style: none;
    gap: 16px;
  }

  .posts-loading {
    opacity: 0.5;
    pointer-events: none;
  }

  .load-more-indicator {
    display: flex;
    justify-content: center;
    padding: 20px;
  }

  /* Responsive */
  @media (min-width: 640px) {
    #banner {
      height: 420px;
    }

    #banner-img {
      animation-range: 0px 450px;
    }

    #avatar {
      animation-range: 0px 400px;
    }

    #avatar-stack {
      width: 134px;
      height: 134px;
    }

    #avatar-container {
      top: -67px;
    }

    #display-name {
      font-size: 22px;
    }

    #tabs-container {
      animation-range: 350px 550px;
    }
  }

  @media (max-width: 640px) {
    #profile-header {
      padding: 0 12px;
    }

    #avatar-container {
      left: 12px;
      top: -50px;
    }

    #avatar-stack {
      width: 100px;
      height: 100px;
    }

    #actions-row {
      min-height: 54px;
    }

    #tabs-container,
    #posts-container {
      padding: 0 12px;
    }

    #display-name {
      font-size: 18px;
    }

    #handle,
    #bio {
      font-size: 14px;
    }
  }

  /* Scroll-driven animations */
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  #profile-info {
    animation: fadeIn 0.3s ease-out;
  }

  /* Stats row scroll animation */
  #stats-row {
    animation: stats-reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 100%;
  }

  @keyframes stats-reveal {
    from {
      opacity: 0;
      transform: translateX(-20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  /* Posts list staggered reveal */
  ul li {
    animation: post-reveal linear both;
    animation-timeline: view();
    animation-range: entry 0% entry 40%;
  }

  @keyframes post-reveal {
    from {
      opacity: 0;
      transform: translateY(30px) scale(0.98);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Tabs container scroll effect */
  #tabs-container {
    animation-timeline: --page-scroll;
    animation-range: 200px 400px;
  }

  @keyframes tabs-sticky {
    from {
      background: transparent;
    }
    to {
      background: color-mix(
        in srgb,
        var(--md-sys-color-surface) 90%,
        transparent
      );
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
    }
  }

  /* Fallback for browsers without scroll-driven animation support */
  @supports not (animation-timeline: scroll()) {
    #banner-img {
      animation: none;
      height: 100%;
      transform: none;
    }

    #avatar {
      animation: none;
      transform: none;
    }

    #stats-row {
      animation: none;
      opacity: 1;
      transform: none;
    }

    ul li {
      animation: none;
      opacity: 1;
      transform: none;
    }

    #tabs-container {
      animation: none;
    }
  }

  /* Offline fallback */
  #offline-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    text-align: center;
    gap: 16px;
    margin-top: 60px;
  }

  #offline-message md-icon {
    font-size: 48px;
    color: var(--md-sys-color-on-surface-variant);
  }

  #offline-message h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: var(--md-sys-color-on-surface);
  }

  #offline-message p {
    margin: 0;
    font-size: 14px;
    color: var(--md-sys-color-on-surface-variant);
    max-width: 300px;
  }
`;

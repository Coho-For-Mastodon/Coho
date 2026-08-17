import { css } from 'lit';

import { spinAnimation } from './animations';

export const postComposerStyles = [
  spinAnimation,
  css`
    :host {
      display: block;
    }

    .composer-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .composer-main-content {
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      gap: 12px;
    }

    .author-avatar {
      width: 40px;
      height: 40px;
      border-radius: var(--md-sys-shape-corner-full, 50%);
      object-fit: cover;
      flex-shrink: 0;
      margin-top: 4px;
    }

    .text-area-wrapper {
      position: relative;
      flex: 1;
      min-width: 0;
      anchor-name: --composer-text-area;
    }

    .mention-dropdown {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: auto;
      z-index: 20;
      max-height: 240px;
      overflow-y: auto;
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(--md-sys-color-surface-container, #f3edf7);
      border: 1px solid var(--md-sys-color-outline-variant, rgba(0, 0, 0, 0.12));
      box-shadow:
        0 8px 20px rgba(0, 0, 0, 0.2),
        0 2px 6px rgba(0, 0, 0, 0.15);
      width: min(320px, 100%);
    }

    @supports (position-anchor: --composer-text-area) {
      .mention-dropdown {
        position-anchor: --composer-text-area;
        top: anchor(bottom);
        left: anchor(left);
        right: auto;
        margin-top: 6px;
      }
    }

    .mention-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 0.15s cubic-bezier(0.2, 0, 0, 1);
    }

    .mention-item:hover,
    .mention-item.active {
      background-color: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #1d1b20) 10%,
        transparent
      );
    }

    .mention-avatar {
      width: 28px;
      height: 28px;
      border-radius: var(--md-sys-shape-corner-full);
      object-fit: cover;
      flex-shrink: 0;
      background: var(--md-sys-color-surface-container-high, #e6e0e9);
    }

    .mention-text {
      display: flex;
      flex-direction: column;
      min-width: 0;
      gap: 2px;
    }

    .mention-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--md-sys-color-on-surface, #1d1b20);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mention-acct {
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .mention-state {
      padding: 12px;
      text-align: center;
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant, #49454f);
    }

    .replying-to-indicator {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: var(--md-sys-color-on-surface-variant);
      padding: 4px 8px;
      background: var(--md-sys-color-surface-container-high);
      border-radius: var(--md-sys-shape-corner-small);
      animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
    }

    .poll-composer {
      animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
      margin-top: 12px;
      padding: 12px;
      border-radius: var(--md-sys-shape-corner-medium);
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #ffffff) 6%,
        transparent
      );
      border: 1px solid
        var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
    }

    .poll-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 10px;
    }

    .poll-title {
      font-weight: 700;
      font-size: var(--md-sys-typescale-title-small-font-size, 14px);
    }

    .poll-subtitle {
      color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
    }

    .poll-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .poll-option-row {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .poll-option-input {
      flex: 1;
    }

    .poll-actions-row {
      display: flex;
      justify-content: flex-end;
    }

    .poll-settings {
      display: flex;
      gap: 12px;
      align-items: center;
      justify-content: space-between;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .poll-error {
      margin-top: 10px;
      color: var(--md-sys-color-error, #ffb4ab);
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
    }

    .schedule-composer {
      animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
      margin-top: 12px;
      padding: 12px;
      border-radius: var(--md-sys-shape-corner-medium);
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, #ffffff) 6%,
        transparent
      );
      border: 1px solid
        var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .schedule-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
      flex-wrap: wrap;
    }

    .schedule-title {
      font-weight: 700;
      font-size: var(--md-sys-typescale-title-small-font-size, 14px);
    }

    .schedule-inputs {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px;
    }

    .schedule-preview {
      color: var(--md-sys-color-on-surface-variant, #cac4d0);
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
    }

    .schedule-error {
      color: var(--md-sys-color-error, #ffb4ab);
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
    }

    md-text-area {
      width: 100%;
    }

    .actions-row {
      display: flex;
      justify-content: flex-start;
      gap: 8px;
      flex-wrap: wrap;
    }

    .mobile-icon-button {
      display: inline-flex;
    }

    .footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .footer-actions > div {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
      flex: 1;
      min-width: 0;
    }

    .footer-meta {
      justify-content: flex-start;
    }

    .footer-primary {
      justify-content: flex-end;
    }

    .draft-action {
      color: var(--md-sys-color-on-surface-variant, #cac4d0);
    }

    .footer-actions > div:nth-child(2) {
      flex: 2;
      align-items: center;
      justify-content: end;
    }

    .draft-picker {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: min(440px, calc(100vw - 64px));
    }

    .draft-picker-copy {
      margin: 0;
      color: var(--md-sys-color-on-surface-variant, #cac4d0);
      font-size: var(--md-sys-typescale-body-medium-font-size, 14px);
    }

    .draft-picker-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }

    .attachments-list {
      padding: 0;
      margin: 0;
      display: flex;
      gap: 6px;
      list-style: none;
      margin-top: 8px;
      overflow: scroll hidden;
    }

    .attachments-list::-webkit-scrollbar {
      display: none;
    }

    .img-preview {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 8em;
      background: #00000040;
      padding: 6px;
      gap: 6px;
      border-radius: var(--md-sys-shape-corner-small);
      animation: fadeSlideIn 0.2s cubic-bezier(0.2, 0, 0, 1) both;
      position: relative;
    }

    .img-preview img,
    .img-preview video {
      width: 8em;
      height: 8em;
      border-radius: var(--md-sys-shape-corner-small);
      object-fit: cover;
    }

    .upload-spinner-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.45);
      border-radius: var(--md-sys-shape-corner-small);
      pointer-events: none;
    }

    .upload-spinner {
      width: 28px;
      height: 28px;
      border: 3px solid rgba(255, 255, 255, 0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .preview-actions {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    md-skeleton {
      height: 8em;
      width: 8em;
    }

    #attachment-loading {
      margin-top: 8px;
    }

    #sensitive-warning {
      animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
      margin-top: 8px;
    }

    #sensitive-warning md-text-field {
      width: 100%;
    }

    .attachments-reveal {
      animation: composerReveal 0.25s cubic-bezier(0.2, 0, 0, 1);
    }

    .proofread-result-container {
      width: 100%;
    }

    .proofread-dropdown {
      width: 100%;
      box-sizing: border-box;
      margin-top: 4px;
      padding: 8px 0;
      background-color: var(--md-sys-color-surface-container, #2b2930);
      color: var(--md-sys-color-on-surface, #e6e1e5);
      border-radius: var(--md-sys-shape-corner-extra-small);
      box-shadow:
        0 1px 2px 0 rgba(0, 0, 0, 0.3),
        0 2px 6px 2px rgba(0, 0, 0, 0.15);
      z-index: 100;
      animation: dropdownFadeIn 0.15s cubic-bezier(0.2, 0, 0, 1);
    }

    @keyframes dropdownFadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .proofread-dropdown-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      gap: 8px;
    }

    .proofread-dropdown-label {
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      color: var(--md-sys-color-on-surface-variant, #cac4d0);
      font-weight: 500;
    }

    .proofread-dropdown-actions {
      display: flex;
      gap: 4px;
    }

    .proofread-dropdown-content {
      max-height: 100px;
      overflow-y: auto;
      padding: 0 12px 8px;
    }

    .proofread-dropdown-content p {
      margin: 0;
      font-size: var(--md-sys-typescale-body-small-font-size, 13px);
      line-height: 1.5;
      color: var(--md-sys-color-on-surface, #e6e1e5);
    }

    .proofread-success {
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      font-size: var(--md-sys-typescale-label-small-font-size, 11px);
      color: var(--md-sys-color-on-surface-variant, #cac4d0);
      background: var(--md-sys-color-surface-container, #2b2930);
      border-radius: var(--md-sys-shape-corner-extra-small);
      white-space: nowrap;
    }

    @media (prefers-color-scheme: light) {
      .proofread-dropdown,
      .proofread-success {
        background-color: var(--md-sys-color-surface-container, #f3edf7);
        color: var(--md-sys-color-on-surface, #1d1b20);
      }

      .proofread-dropdown-label {
        color: var(--md-sys-color-on-surface-variant, #49454f);
      }

      .proofread-dropdown-content p {
        color: var(--md-sys-color-on-surface, #1d1b20);
      }
    }

    .proofread-button {
      --md-icon-button-icon-size: 18px;
      transition: opacity 0.2s ease;
    }

    .proofread-button[disabled] {
      opacity: 0.3;
    }

    @keyframes composerReveal {
      from {
        opacity: 0;
        transform: translateY(-4px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeSlideIn {
      from {
        opacity: 0;
        transform: translateY(6px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .publish-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: opacity 0.15s cubic-bezier(0.2, 0, 0, 1);
    }

    .publish-spinner {
      display: inline-block;
      width: 14px;
      height: 14px;
      border: 2px solid currentColor;
      border-right-color: transparent;
      border-radius: var(--md-sys-shape-corner-circle);
      animation: spin 0.8s linear infinite;
    }

    .publish-success-icon {
      display: inline-flex;
      animation: successPop 0.3s cubic-bezier(0.2, 0, 0, 1);
    }

    @keyframes successPop {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      60% {
        transform: scale(1.15);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    .char-count {
      font-size: var(--md-sys-typescale-label-small-font-size, 11px);
      color: var(--md-sys-color-on-surface-variant, #cac4d0);
      transition: color 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .char-count.near-limit {
      color: #f59e0b;
    }

    .char-count.over-limit {
      color: var(--md-sys-color-error, #ffb4ab);
    }

    .draft-status {
      font-size: var(--md-sys-typescale-label-small-font-size, 11px);
      color: var(--md-sys-color-on-surface-variant, #cac4d0);
      animation: draftStatusFadeIn 0.2s cubic-bezier(0.2, 0, 0, 1);
    }

    .draft-status.saved {
      animation: draftSavedFade 3s cubic-bezier(0.2, 0, 0, 1) forwards;
    }

    @keyframes draftStatusFadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes draftSavedFade {
      0%,
      70% {
        opacity: 1;
      }
      100% {
        opacity: 0;
      }
    }

    .draft-action.has-drafts {
      color: var(--md-sys-color-primary, #d0bcff);
    }

    .text-area-wrapper.draft-loaded md-text-area {
      animation: draftHighlight 0.6s cubic-bezier(0.2, 0, 0, 1);
    }

    @keyframes draftHighlight {
      0% {
        box-shadow: 0 0 0 0
          color-mix(
            in srgb,
            var(--md-sys-color-primary, #d0bcff) 40%,
            transparent
          );
      }
      40% {
        box-shadow: 0 0 0 3px
          color-mix(
            in srgb,
            var(--md-sys-color-primary, #d0bcff) 30%,
            transparent
          );
      }
      100% {
        box-shadow: 0 0 0 0 transparent;
      }
    }

    :host([dragging-over]) .composer-wrapper {
      outline: 2px dashed var(--md-sys-color-primary, #d0bcff);
      outline-offset: -4px;
      background: color-mix(
        in srgb,
        var(--md-sys-color-primary, #d0bcff) 8%,
        transparent
      );
      border-radius: var(--md-sys-shape-corner-medium);
    }

    @media (max-width: 820px) {
      .actions-row {
        flex-wrap: nowrap;
        overflow-x: visible;
        gap: 6px;
        justify-content: flex-end;
      }

      .actions-row > * {
        flex: 0 0 auto;
      }

      .schedule-inputs {
        grid-template-columns: 1fr;
      }

      .footer-actions {
        position: fixed;
        bottom: 16px;
        left: 12px;
        right: 12px;
      }

      :host([dialog-mode]) .footer-actions {
        left: auto;
        right: auto;
        bottom: auto;
      }
    }

    :host([compact]) .footer-actions {
      position: static;
    }

    :host([dialog-mode]) .composer-wrapper {
      gap: 6px;
    }

    :host([dialog-mode]) .replying-to-indicator {
      min-height: 32px;
      padding: 0 0 2px 2px;
      background: transparent;
      border-bottom: 1px solid
        color-mix(
          in srgb,
          var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12)) 70%,
          transparent
        );
      border-radius: 0;
      color: var(--md-sys-color-on-surface-variant, #cac4d0);
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      line-height: 16px;
    }

    :host([dialog-mode]) .replying-to-indicator span {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    :host([dialog-mode]) .replying-to-indicator md-icon-button {
      flex: 0 0 auto;
      margin-right: -6px;
    }

    :host([dialog-mode]) .replying-to-indicator md-icon-button::part(base) {
      width: 32px;
      height: 32px;
      padding: 4px;
    }

    :host([dialog-mode]) .replying-to-indicator md-icon-button::part(icon) {
      width: 20px;
      height: 20px;
    }

    :host([dialog-mode]) .actions-row {
      gap: 4px;
    }

    :host([dialog-mode]) .footer-actions {
      position: static;
      align-items: center;
      gap: 4px 10px;
      padding-top: 0;
    }

    :host([dialog-mode]) .footer-actions > div {
      gap: 6px;
    }

    :host([dialog-mode]) .footer-meta {
      min-height: 32px;
    }

    :host([dialog-mode]) .footer-actions > div:nth-child(2),
    :host([dialog-mode]) .footer-primary {
      flex: 0 0 auto;
    }
  `,
];

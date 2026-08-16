import { css } from 'lit';

/**
 * Styles for the lists-dialog component.
 */
export const listsDialogStyles = css`
  md-dialog::part(dialog) {
    max-width: 620px;
    width: 92vw;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }

  .section {
    display: grid;
    gap: 12px;
  }

  .section-title {
    font-size: 12px;
    font-weight: 700;
    color: var(--md-sys-color-on-surface-variant, #49454f);
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .create-form {
    display: grid;
    gap: 12px;
  }

  .create-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: end;
  }

  .field-group {
    display: grid;
    gap: 8px;
  }

  .field-label {
    color: var(--md-sys-color-on-surface-variant, #49454f);
    font-size: 12px;
    font-weight: 600;
  }

  .list {
    display: flex;
    flex-direction: column;
    gap: 10px;
    min-height: 160px;
    max-height: min(38vh, 360px);
    overflow-y: auto;
    padding-right: 4px;
  }

  .list-placeholder .empty {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    min-height: 64px;
    padding: 10px 8px 10px 16px;
    border-radius: var(--md-sys-shape-corner-medium);
    border: 1px solid
      color-mix(
        in srgb,
        var(
            --md-sys-color-outline-variant,
            var(--md-sys-color-outline, #79747e)
          )
          55%,
        transparent
      );
    background: color-mix(
      in srgb,
      var(--md-sys-color-surface-container-low, #f7f2f8) 88%,
      transparent
    );
  }

  .list-main {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .list-title {
    font-weight: 600;
    font-size: 16px;
    color: var(--md-sys-color-on-surface, #1d1b20);
    min-width: 0;
  }

  .list-meta {
    font-size: 11px;
    color: var(--md-sys-color-on-surface-variant, #49454f);
    padding: 4px 9px;
    border-radius: var(--md-sys-shape-corner-full);
    background: color-mix(
      in srgb,
      var(--md-sys-color-secondary-container, #e8def8) 36%,
      transparent
    );
  }

  .list-actions {
    display: flex;
    align-items: center;
    gap: 2px;
    flex-shrink: 0;
  }

  .list-actions md-icon-button::part(base) {
    height: 36px;
    padding: 7px;
    width: 36px;
  }

  .list-actions md-icon-button::part(icon) {
    height: 20px;
    width: 20px;
  }

  .empty {
    padding: 12px;
    border-radius: var(--md-sys-shape-corner-medium);
    background: var(--md-sys-color-surface-container-low, #f7f2f8);
    color: var(--md-sys-color-on-surface-variant, #49454f);
    font-size: 14px;
  }

  .error {
    color: var(--md-sys-color-error, #b3261e);
    font-size: 13px;
  }

  .policy-toggle {
    display: inline-flex;
    width: fit-content;
    max-width: 100%;
    gap: 4px;
    flex-wrap: wrap;
    padding: 4px;
    border-radius: var(--md-sys-shape-corner-full);
    background: color-mix(
      in srgb,
      var(--md-sys-color-surface-container-highest, #36343b) 48%,
      transparent
    );
  }

  .policy-chip {
    padding: 5px 12px;
    min-height: 32px;
    border-radius: var(--md-sys-shape-corner-full);
    border: none;
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    color: var(--md-sys-color-on-surface-variant, #49454f);
    background: transparent;
  }

  .policy-chip[aria-pressed='true'] {
    background: var(--md-sys-color-primary-container, #eaddff);
    border-color: transparent;
    color: var(--md-sys-color-on-primary-container, #21005d);
  }

  .member-disclosure {
    border-top: 1px solid
      color-mix(
        in srgb,
        var(--md-sys-color-outline-variant, #79747e) 52%,
        transparent
      );
    padding-top: 4px;
  }

  .member-disclosure summary {
    -webkit-tap-highlight-color: transparent;
    align-items: center;
    border-radius: var(--md-sys-shape-corner-full);
    color: var(--md-sys-color-primary, var(--sl-color-primary-600));
    cursor: pointer;
    display: inline-flex;
    font-size: 13px;
    font-weight: 600;
    gap: 6px;
    list-style: none;
    min-height: 36px;
    padding: 0 10px;
    width: fit-content;
  }

  .member-disclosure summary::-webkit-details-marker {
    display: none;
  }

  .member-disclosure summary::before {
    content: '+';
    font-size: 18px;
    line-height: 1;
  }

  .member-disclosure[open] summary::before {
    content: '-';
  }

  .member-disclosure summary:hover {
    background: color-mix(
      in srgb,
      var(--md-sys-color-primary, var(--sl-color-primary-600)) 9%,
      transparent
    );
  }

  .member-search-results {
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 184px;
    overflow-y: auto;
  }

  .selected-members {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .account-row {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px;
    border-radius: var(--md-sys-shape-corner-medium);
    background: color-mix(
      in srgb,
      var(--md-sys-color-surface-container, #f3edf7) 78%,
      transparent
    );
  }

  .account-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
  }

  .account-info {
    flex: 1;
    min-width: 0;
  }

  .account-display-name {
    font-weight: 600;
    font-size: 12px;
    color: var(--md-sys-color-on-surface, #1d1b20);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .account-acct {
    font-size: 10px;
    color: var(--md-sys-color-on-surface-variant, #49454f);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .search-hint {
    font-size: 12px;
    color: var(--md-sys-color-on-surface-variant, #49454f);
    padding: 2px 0 0;
  }

  .member-picker {
    display: grid;
    gap: 8px;
    padding-top: 8px;
  }

  @keyframes fadeDown {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .member-picker md-text-field::part(base) {
    animation: fadeDown 300ms ease;
  }

  .member-pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    max-width: 100%;
    min-height: 32px;
    padding: 4px 6px 4px 4px;
    border-radius: var(--md-sys-shape-corner-full);
    background: color-mix(
      in srgb,
      var(--md-sys-color-secondary-container, #e8def8) 52%,
      transparent
    );
    color: var(--md-sys-color-on-surface, #1d1b20);
  }

  .member-pill img {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    flex-shrink: 0;
    object-fit: cover;
  }

  .member-pill-label {
    max-width: 168px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    font-weight: 500;
  }

  .member-pill-remove {
    appearance: none;
    border: none;
    background: transparent;
    color: inherit;
    width: 24px;
    height: 24px;
    padding: 0;
    border-radius: 50%;
    cursor: pointer;
    flex-shrink: 0;
    font-size: 16px;
    line-height: 1;
  }

  .member-pill-remove:hover {
    background: color-mix(
      in srgb,
      var(--md-sys-color-on-surface, #1d1b20) 10%,
      transparent
    );
  }

  @media (max-width: 520px) {
    .create-row {
      grid-template-columns: 1fr;
    }

    .policy-toggle {
      width: 100%;
    }

    .policy-chip {
      flex: 1 1 auto;
    }

    .list-item {
      align-items: flex-start;
      flex-direction: column;
    }

    .list-actions {
      justify-content: flex-start;
    }

    .member-pill-label {
      max-width: 140px;
    }
  }
`;

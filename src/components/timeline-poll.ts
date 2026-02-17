import { LitElement, css, html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { msg, str, localized } from '@lit/localize';

import type { Post } from '../interfaces/Post';
import { votePoll } from '../services/timeline';

import '../components/md/md-checkbox';
import '../components/md/md-button';

type Poll = NonNullable<Post['poll']>;

function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatRelativeShort(target: Date, now: Date): string {
  const deltaMs = target.getTime() - now.getTime();
  const abs = Math.abs(deltaMs);

  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  // Keep it intentionally compact for timeline density.
  if (abs < hour) {
    const mins = Math.max(1, Math.round(abs / minute));
    return `${mins}m`;
  }
  if (abs < day) {
    const hrs = Math.max(1, Math.round(abs / hour));
    return `${hrs}h`;
  }

  const days = Math.max(1, Math.round(abs / day));
  return `${days}d`;
}

@localized()
@customElement('timeline-poll')
export class TimelinePoll extends LitElement {
  @property({ type: Object }) post: Post | undefined;

  @state() private selected: number[] = [];
  @state() private submitting: boolean = false;
  @state() private error: string | null = null;
  @state() private forceShowResults: boolean = false;

  protected updated(changed: Map<string, unknown>) {
    if (changed.has('post')) {
      // Reset any local-only state when the underlying post changes.
      this.selected = [];
      this.submitting = false;
      this.error = null;
      this.forceShowResults = false;
    }
  }

  static styles = css`
    :host {
      display: block;
      margin-top: 12px;
      margin-bottom: 8px;
    }

    .container {
      border: 1px solid
        var(--md-sys-color-outline-variant, rgba(255, 255, 255, 0.12));
      border-radius: var(--md-sys-shape-corner-medium);
      background: var(
        --md-sys-color-surface-container-high,
        rgba(255, 255, 255, 0.06)
      );
      padding: 12px;
    }

    .header {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }

    .title {
      font-size: var(--md-sys-typescale-title-small-font-size, 14px);
      font-weight: 700;
      letter-spacing: 0.1px;
      color: var(--md-sys-color-on-surface, #fff);
      margin: 0;
    }

    .meta {
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
      white-space: nowrap;
    }

    .options {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .option-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    md-checkbox {
      flex: 1;
      min-width: 0;
    }

    .result {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      min-width: 84px;
      justify-content: flex-end;
      color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
    }

    .bar {
      width: 84px;
      height: 8px;
      border-radius: var(--md-sys-shape-corner-full);
      background: color-mix(
        in srgb,
        var(--md-sys-color-on-surface, white) 10%,
        transparent
      );
      overflow: hidden;
    }

    .bar > div {
      height: 100%;
      width: 0%;
      background: var(
        --md-sys-color-primary,
        var(--sl-color-primary-600, #6750a4)
      );
      border-radius: var(--md-sys-shape-corner-full);
      transition: width 180ms cubic-bezier(0.2, 0, 0, 1);
    }

    .footer {
      margin-top: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
    }

    .hint {
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      color: var(--md-sys-color-on-surface-variant, rgba(255, 255, 255, 0.7));
    }

    .error {
      margin-top: 10px;
      font-size: var(--md-sys-typescale-label-medium-font-size, 12px);
      color: var(--md-sys-color-error, #ffb4ab);
    }

    @media (prefers-color-scheme: light) {
      .container {
        border-color: var(--md-sys-color-outline-variant, rgba(0, 0, 0, 0.12));
        background: var(
          --md-sys-color-surface-container-high,
          rgba(0, 0, 0, 0.03)
        );
      }

      .title {
        color: var(--md-sys-color-on-surface, #1d1b20);
      }

      .meta,
      .result,
      .hint {
        color: var(--md-sys-color-on-surface-variant, rgba(0, 0, 0, 0.6));
      }

      .bar {
        background: color-mix(in srgb, black 10%, transparent);
      }
    }
  `;

  private _poll(): Poll | null {
    return this.post?.poll ?? null;
  }

  private _hasVoted(poll: Poll): boolean {
    // Mastodon may return `voted: true` for your own poll even if you haven't
    // actually voted. The definitive signal is `own_votes` containing indices.
    // So we only consider `voted: true` as a real vote if:
    //   1) own_votes has at least one entry, OR
    //   2) own_votes is undefined/null (legacy API) and voted === true
    const hasOwnVotes =
      Array.isArray(poll.own_votes) && poll.own_votes.length > 0;

    // If own_votes is present (even empty), trust it over `voted`.
    if (Array.isArray(poll.own_votes)) {
      return hasOwnVotes;
    }

    // Fallback: older Mastodon versions may not include own_votes.
    return poll.voted === true;
  }

  private _isExpired(poll: Poll): boolean {
    if (poll.expired) return true;
    const expiresAt = parseDate(poll.expires_at ?? null);
    if (!expiresAt) return false;
    return expiresAt.getTime() <= Date.now();
  }

  /**
   * Returns true if the current authenticated user is the author of this poll.
   * Mastodon doesn't allow voting on your own polls, so we show results instead.
   */
  private _isOwnPoll(): boolean {
    if (!this.post) return false;

    const currentUserId = localStorage.getItem('currentUserID');
    if (!currentUserId) return false;

    // Check both the direct post and reblog (the poll belongs to the original author)
    const pollAuthorId = this.post.reblog?.account?.id ?? this.post.account?.id;
    return pollAuthorId === currentUserId;
  }

  private _shouldShowResults(poll: Poll): boolean {
    return (
      this.forceShowResults ||
      this._isOwnPoll() ||
      this._isExpired(poll) ||
      this._hasVoted(poll)
    );
  }

  private _onCheckboxChange(e: Event, optionIndex: number) {
    e.stopPropagation();
    const poll = this._poll();
    if (!poll) return;

    const target = e.currentTarget as HTMLElement & { checked?: boolean };
    const checked = target.checked === true;

    if (!poll.multiple) {
      this.selected = checked ? [optionIndex] : [];
      return;
    }

    const set = new Set(this.selected);
    if (checked) set.add(optionIndex);
    else set.delete(optionIndex);
    this.selected = Array.from(set).sort((a, b) => a - b);
  }

  private async _submitVote(e: Event) {
    e.stopPropagation();
    e.preventDefault();

    const poll = this._poll();
    if (!this.post || !poll) return;

    this.error = null;

    if (this._shouldShowResults(poll)) return;
    if (this.selected.length === 0) return;

    this.submitting = true;
    try {
      const updated = await votePoll(poll.id, this.selected);
      this.post.poll = updated;

      // Clear selection after a successful vote.
      this.selected = [];

      this.dispatchEvent(
        new CustomEvent('poll-updated', {
          detail: { poll: updated, post: this.post },
          bubbles: true,
          composed: true,
        })
      );

      this.requestUpdate();
    } catch (err) {
      console.error('Failed to vote in poll', err);
      const message =
        (err as Error | undefined)?.message || msg('Could not submit vote.');

      // If the server forbids voting (common for "own poll" or lack of permission),
      // show results instead of leaving the UI stuck in "vote" mode.
      const status = (err as Error & { status?: number })?.status;
      if (status === 403 || /own poll|forbidden|not allowed/i.test(message)) {
        this.forceShowResults = true;
      }

      this.error = message;
    } finally {
      this.submitting = false;
    }
  }

  private _renderMeta(poll: Poll) {
    const expiresAt = parseDate(poll.expires_at ?? null);
    if (!expiresAt) return html``;

    const now = new Date();
    const expired = this._isExpired(poll);

    if (expired) {
      return html`<span class="meta">${msg('Ended')}</span>`;
    }

    return html`<span class="meta"
      >${msg(str`Ends in ${formatRelativeShort(expiresAt, now)}`)}</span
    >`;
  }

  private _renderOptions(poll: Poll) {
    const showResults = this._shouldShowResults(poll);
    const options = poll.options ?? [];
    const totalVotes =
      options.reduce((sum, opt) => sum + (opt.votes_count || 0), 0) ||
      poll.votes_count ||
      0;

    return html`
      <div class="options" @click=${(e: Event) => e.stopPropagation()}>
        ${options.map((opt, idx) => {
          const isChecked = this.selected.includes(idx);
          const pct =
            showResults && totalVotes > 0
              ? Math.round(((opt.votes_count || 0) / totalVotes) * 100)
              : 0;

          return html`
            <div class="option-row">
              ${showResults
                ? html`
                    <div
                      style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:0;"
                    >
                      <div
                        style="display:flex; justify-content:space-between; gap:12px;"
                      >
                        <div
                          style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"
                        >
                          ${opt.title}
                        </div>
                        <div style="flex:0 0 auto;">${pct}%</div>
                      </div>
                      <div class="bar" aria-hidden="true">
                        <div style="width:${pct}%"></div>
                      </div>
                    </div>
                  `
                : html`
                    <md-checkbox
                      .checked=${isChecked}
                      .value=${String(idx)}
                      @change=${(e: Event) => this._onCheckboxChange(e, idx)}
                    >
                      ${opt.title}
                    </md-checkbox>
                  `}
            </div>
          `;
        })}
      </div>
    `;
  }

  private _renderFooterHint(poll: Poll, showResults: boolean) {
    const voteCount = poll.votes_count ?? 0;
    const votesLabel =
      voteCount === 1 ? msg('1 vote') : msg(str`${voteCount} votes`);

    if (showResults) {
      if (this._isOwnPoll()) {
        return html`${msg('Your poll')} · ${votesLabel}`;
      }
      return html`${votesLabel}`;
    }

    return poll.multiple ? msg('Select one or more') : msg('Select one');
  }

  render() {
    const poll = this._poll();
    if (!poll) return html``;

    const showResults = this._shouldShowResults(poll);
    const isExpired = this._isExpired(poll);

    return html`
      <div class="container" @click=${(e: Event) => e.stopPropagation()}>
        <div class="header">
          <p class="title">${msg('Poll')}</p>
          ${this._renderMeta(poll)}
        </div>

        ${this._renderOptions(poll)}

        <div class="footer" @click=${(e: Event) => e.stopPropagation()}>
          <div class="hint">${this._renderFooterHint(poll, showResults)}</div>

          ${showResults
            ? html``
            : html`
                <md-button
                  variant="filled"
                  size="small"
                  pill
                  ?disabled=${this.submitting ||
                  this.selected.length === 0 ||
                  isExpired}
                  @click=${this._submitVote}
                >
                  ${this.submitting ? msg('Voting…') : msg('Vote')}
                </md-button>
              `}
        </div>

        ${this.error ? html`<div class="error">${this.error}</div>` : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'timeline-poll': TimelinePoll;
  }
}

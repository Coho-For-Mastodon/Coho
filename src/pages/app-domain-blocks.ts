import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { localized, msg, str } from '@lit/localize';
import {
  fetchAllDomainBlocks,
  blockDomain,
  unblockDomain,
} from '../mastodon/api/domain-blocks';
import {
  parseCsvText,
  formatDatedExportFilename,
  downloadUtf8Csv,
} from '../utils/csv-simple';
import { userListStyles } from '../styles/user-list-styles';

import '../components/md/md-skeleton';
import '../components/md/md-button';

const DOMAIN_CSV_HEADER = '#domain';

function isDomainHeaderCell(cell: string): boolean {
  const t = cell.trim().toLowerCase();
  return t === '#domain' || t === 'domain';
}

function extractDomainsFromCsvText(text: string): string[] {
  const rows = parseCsvText(text);
  if (rows.length === 0) return [];
  let start = 0;
  if (rows[0]?.[0] !== undefined && isDomainHeaderCell(rows[0][0])) {
    start = 1;
  }
  const out: string[] = [];
  for (let r = start; r < rows.length; r++) {
    const cell = rows[r]?.[0]?.trim() ?? '';
    if (!cell || cell.startsWith('#')) continue;
    out.push(cell);
  }
  return out;
}

function buildDomainCsv(domains: string[]): string {
  const uniq = [...new Set(domains.map((d) => d.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent' })
  );
  const lines = [DOMAIN_CSV_HEADER, ...uniq];
  return `\uFEFF${lines.join('\n')}\n`;
}

@localized()
@customElement('app-domain-blocks')
export class AppDomainBlocks extends LitElement {
  @state() private domains: string[] = [];
  @state() private loading = false;
  @state() private _importing = false;
  @state() private _importProgress = '';
  @state() private _unblockingDomains = new Set<string>();

  static styles = [
    userListStyles,
    css`
      main {
        padding-left: 6em;
        padding-right: 6em;
        box-sizing: border-box;
      }

      @media (max-width: 820px) {
        main {
          padding-left: 12px;
          padding-right: 12px;
        }
      }

      h2 {
        animation: slideInFromLeft 0.3s ease-in-out;
        padding-left: 0;
      }

      ul {
        padding-left: 0;
        padding-right: 0;
      }

      .list-actions {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .import-hint {
        font-size: 0.85rem;
        color: var(--md-sys-color-on-surface-variant, #878792);
        margin: 0 0 12px;
        max-width: none;
      }

      ul li {
        animation: slideUp 0.3s ease-in-out;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      ul li md-button {
        flex-shrink: 0;
      }

      .domain-name {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: var(--md-sys-typescale-body-large-font-size, 1rem);
      }
    `,
  ];

  async firstUpdated() {
    await this._loadDomainBlocks();
  }

  private async _loadDomainBlocks() {
    this.loading = true;
    try {
      this.domains = await fetchAllDomainBlocks();
    } catch (error) {
      console.error('Failed to load blocked domains', error);
    } finally {
      this.loading = false;
    }
  }

  private _exportCsv() {
    const csv = buildDomainCsv(this.domains);
    downloadUtf8Csv(formatDatedExportFilename('coho-domain-blocks'), csv);
    window.dispatchEvent(
      new CustomEvent('app-toast', {
        detail: {
          message: msg('Exported domain block list.'),
          variant: 'success',
        },
      })
    );
  }

  private _openImportPicker() {
    const input = this.shadowRoot?.querySelector<HTMLInputElement>(
      'input[data-csv-import]'
    );
    input?.click();
  }

  private async _onImportFile(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    this._importing = true;
    this._importProgress = '';
    try {
      const text = await file.text();
      const incoming = extractDomainsFromCsvText(text);
      const existing = new Set(this.domains);
      const toBlock = incoming.filter((d) => !existing.has(d));

      let imported = 0;
      const skipped = incoming.length - toBlock.length;
      let failed = 0;

      for (let i = 0; i < toBlock.length; i++) {
        this._importProgress =
          toBlock.length > 0 ? `${i + 1} / ${toBlock.length}` : '';
        this.requestUpdate();
        try {
          await blockDomain(toBlock[i]);
          imported++;
          this.domains = [...this.domains, toBlock[i]];
        } catch {
          failed++;
        }
      }

      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg(
              str`Import finished: ${imported} imported, ${skipped} skipped, ${failed} failed.`
            ),
            variant: imported === 0 && failed > 0 ? 'error' : 'success',
          },
        })
      );
    } catch (error) {
      console.error('CSV import failed', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Import failed. Please try again.'),
            variant: 'error',
          },
        })
      );
    } finally {
      this._importing = false;
      this._importProgress = '';
    }
  }

  private async _unblock(domain: string) {
    const next = new Set(this._unblockingDomains);
    next.add(domain);
    this._unblockingDomains = next;

    try {
      await unblockDomain(domain);
      this.domains = this.domains.filter((d) => d !== domain);
    } catch (error) {
      console.error('Failed to unblock domain', error);
      window.dispatchEvent(
        new CustomEvent('app-toast', {
          detail: {
            message: msg('Failed to unblock domain. Please try again.'),
            variant: 'error',
          },
        })
      );
    } finally {
      const updated = new Set(this._unblockingDomains);
      updated.delete(domain);
      this._unblockingDomains = updated;
    }
  }

  render() {
    return html`
      <app-header ?enableBack="${true}"></app-header>

      <main>
        <h2>${msg('Blocked Domains')}</h2>
        <p class="import-hint">
          ${msg(
            'Export or import a list of blocked domains as CSV. Blocking a domain hides all content from that server.'
          )}
        </p>
        <div class="list-actions">
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            data-csv-import
            hidden
            @change=${this._onImportFile}
          />
          <md-button
            variant="outlined"
            size="small"
            ?disabled=${this._importing}
            @click=${this._exportCsv}
          >
            ${msg('Export CSV')}
          </md-button>
          <md-button
            variant="filled"
            size="small"
            ?disabled=${this._importing}
            @click=${this._openImportPicker}
          >
            ${
              this._importing
                ? this._importProgress
                  ? msg(str`Importing… ${this._importProgress}`)
                  : msg('Importing…')
                : msg('Import CSV')
            }
          </md-button>
        </div>
        <ul class="scrollbar-hidden">
          ${
            this.loading && this.domains.length === 0
              ? Array.from({ length: 6 }, () => {
                  return html`
                    <li class="skeleton-row">
                      <div class="skeleton-lines">
                        <md-skeleton width="200px" height="16px"></md-skeleton>
                      </div>
                    </li>
                  `;
                })
              : this.domains.length === 0
                ? html`<li class="empty-state">
                    ${msg('No blocked domains.')}
                  </li>`
                : this.domains.map((domain) => {
                    return html`
                      <li>
                        <span class="domain-name">${domain}</span>
                        <md-button
                          variant="text"
                          size="small"
                          ?disabled=${this._unblockingDomains.has(domain)}
                          @click=${() => this._unblock(domain)}
                        >
                          ${
                            this._unblockingDomains.has(domain)
                              ? msg('Unblocking...')
                              : msg('Unblock')
                          }
                        </md-button>
                      </li>
                    `;
                  })
          }
        </ul>
      </main>
    `;
  }
}

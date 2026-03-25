/**
 * Minimal CSV parsing and building for single-column Mastodon-style lists
 * (e.g. exported blocked/muted account addresses).
 */

export const ACCOUNT_ADDRESS_HEADER = 'Account address';

/** RFC 4180-style rows; supports quoted fields with "" escapes. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = '';
  };

  const flushRow = () => {
    pushField();
    if (row.some((c) => c.length > 0)) {
      rows.push(row);
    }
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\n') {
      flushRow();
    } else if (c !== '\r') {
      field += c;
    }
  }
  pushField();
  if (row.some((c) => c.length > 0)) {
    rows.push(row);
  }

  return rows;
}

function isHeaderCell(cell: string): boolean {
  const t = cell.trim().toLowerCase();
  return (
    t === 'account address' ||
    t === 'address' ||
    t === 'acct' ||
    t === 'account'
  );
}

/**
 * Returns trimmed account address strings from CSV rows (first column).
 * Skips blank lines, # comments, and a recognized header row.
 */
export function extractAccountAddressesFromRows(rows: string[][]): string[] {
  if (rows.length === 0) return [];
  let start = 0;
  if (rows[0]?.[0] !== undefined && isHeaderCell(rows[0][0])) {
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

export function extractAccountAddressesFromCsvText(text: string): string[] {
  return extractAccountAddressesFromRows(parseCsvText(text));
}

/** Append @host when the handle has no domain (local username). */
export function normalizeAcctForLookup(
  raw: string,
  serverHost: string
): string | null {
  const t = raw.trim();
  if (!t || t.startsWith('#')) return null;
  if (t.includes('@')) return t;
  const host = serverHost.replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!host) return null;
  return `${t}@${host}`;
}

function encodeCsvField(s: string): string {
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** UTF-8 BOM + header + sorted unique addresses (Mastodon-friendly). */
export function buildAccountAddressCsv(addresses: string[]): string {
  const uniq = [
    ...new Set(addresses.map((a) => a.trim()).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'accent' }));
  const lines = [ACCOUNT_ADDRESS_HEADER, ...uniq.map(encodeCsvField)];
  return `\uFEFF${lines.join('\n')}\n`;
}

export function formatDatedExportFilename(prefix: string): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${prefix}-${y}-${m}-${day}.csv`;
}

export function downloadUtf8Csv(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

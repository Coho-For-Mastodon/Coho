import { describe, it, expect } from 'vitest';
import {
  parseCsvText,
  extractAccountAddressesFromRows,
  extractAccountAddressesFromCsvText,
  normalizeAcctForLookup,
  buildAccountAddressCsv,
  ACCOUNT_ADDRESS_HEADER,
} from '../../src/utils/csv-simple';

describe('csv-simple', () => {
  it('parses quoted fields with commas', () => {
    const rows = parseCsvText('"a,b","c"\n');
    expect(rows).toEqual([['a,b', 'c']]);
  });

  it('extracts addresses with header row', () => {
    const text = `Account address
foo@bar.social
localuser
`;
    expect(extractAccountAddressesFromCsvText(text)).toEqual([
      'foo@bar.social',
      'localuser',
    ]);
  });

  it('normalizes local usernames to @host', () => {
    expect(normalizeAcctForLookup('someone', 'tech.lgbt')).toBe(
      'someone@tech.lgbt'
    );
    expect(normalizeAcctForLookup('a@b.c', 'tech.lgbt')).toBe('a@b.c');
    expect(normalizeAcctForLookup('  ', 'tech.lgbt')).toBeNull();
  });

  it('builds CSV with header and BOM', () => {
    const csv = buildAccountAddressCsv(['z@a', 'a@b']);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(ACCOUNT_ADDRESS_HEADER);
    expect(csv).toContain('a@b');
    expect(csv.indexOf('a@b')).toBeLessThan(csv.indexOf('z@a'));
  });

  it('extractAccountAddressesFromRows skips header alias', () => {
    const rows = parseCsvText('acct\nx@y.z');
    expect(extractAccountAddressesFromRows(rows)).toEqual(['x@y.z']);
  });
});

import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';

const DOMAIN_BLOCKS_PAGE_LIMIT = 80;

export async function getDomainBlocks(
  maxId?: string,
  limit: number = DOMAIN_BLOCKS_PAGE_LIMIT
): Promise<string[]> {
  const { url } = getClientConfig();
  const params = new URLSearchParams({ limit: String(limit) });
  if (maxId) {
    params.set('max_id', maxId);
  }

  const response = await apiFetch(
    `https://${url}/api/v1/domain_blocks?${params.toString()}`,
    { method: 'GET' }
  );

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function fetchAllDomainBlocks(): Promise<string[]> {
  const out: string[] = [];
  let maxId: string | undefined;
  for (;;) {
    const page = await getDomainBlocks(maxId);
    if (page.length === 0) break;
    out.push(...page);
    if (page.length < DOMAIN_BLOCKS_PAGE_LIMIT) break;
    maxId = page[page.length - 1];
  }
  return out;
}

export async function blockDomain(domain: string): Promise<void> {
  const { url } = getClientConfig();
  const body = new FormData();
  body.set('domain', domain);
  await apiFetch(`https://${url}/api/v1/domain_blocks`, {
    method: 'POST',
    body,
  });
}

export async function unblockDomain(domain: string): Promise<void> {
  const { url } = getClientConfig();
  const body = new FormData();
  body.set('domain', domain);
  await apiFetch(`https://${url}/api/v1/domain_blocks`, {
    method: 'DELETE',
    body,
  });
}

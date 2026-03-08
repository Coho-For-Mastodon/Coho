import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { Account } from '../types';

export const getFollowRequests = async (
  maxId?: string,
  limit: number = 20
): Promise<Account[]> => {
  const { url } = getClientConfig();
  const params = new URLSearchParams();
  params.set('limit', limit.toString());
  if (maxId) {
    params.set('max_id', maxId);
  }

  const response = await apiFetch(
    `https://${url}/api/v1/follow_requests?${params.toString()}`,
    { method: 'GET' }
  );

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

export const authorizeFollowRequest = async (id: string): Promise<void> => {
  const { url } = getClientConfig();
  await apiFetch(`https://${url}/api/v1/follow_requests/${id}/authorize`, {
    method: 'POST',
  });
};

export const rejectFollowRequest = async (id: string): Promise<void> => {
  const { url } = getClientConfig();
  await apiFetch(`https://${url}/api/v1/follow_requests/${id}/reject`, {
    method: 'POST',
  });
};

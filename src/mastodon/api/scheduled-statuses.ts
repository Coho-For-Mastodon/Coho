import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import type { ScheduledStatus } from '../types';

export interface GetScheduledStatusesOptions {
  limit?: number;
  maxId?: string;
  sinceId?: string;
  minId?: string;
}

export const getScheduledStatuses = async (
  options: GetScheduledStatusesOptions = {}
): Promise<ScheduledStatus[]> => {
  const { url } = getClientConfig();
  const params = new URLSearchParams();

  if (options.limit != null) {
    params.set('limit', String(options.limit));
  }
  if (options.maxId) {
    params.set('max_id', options.maxId);
  }
  if (options.sinceId) {
    params.set('since_id', options.sinceId);
  }
  if (options.minId) {
    params.set('min_id', options.minId);
  }

  const query = params.toString();
  const response = await apiFetch(
    `https://${url}/api/v1/scheduled_statuses${query ? `?${query}` : ''}`,
    {
      method: 'GET',
    }
  );

  const data = await response.json();
  return data as ScheduledStatus[];
};

export const updateScheduledStatus = async (
  id: string,
  scheduledAt: string
): Promise<ScheduledStatus> => {
  const { url } = getClientConfig();
  const body = new URLSearchParams();
  body.set('scheduled_at', scheduledAt);

  const response = await apiFetch(
    `https://${url}/api/v1/scheduled_statuses/${id}`,
    {
      method: 'PUT',
      body,
    }
  );

  const data = await response.json();
  return data as ScheduledStatus;
};

export const deleteScheduledStatus = async (id: string): Promise<void> => {
  const { url } = getClientConfig();
  await apiFetch(`https://${url}/api/v1/scheduled_statuses/${id}`, {
    method: 'DELETE',
  });
};

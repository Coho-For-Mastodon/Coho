import { getClientConfig } from '../config/client';
import { apiFetch } from '../../utils/api-client';
import { Conversation } from '../types';

/**
 * Fetch paginated conversations (DMs).
 * Uses cursor-based pagination via `max_id`.
 */
export const getConversations = async (
  maxId?: string,
  limit: number = 20
): Promise<Conversation[]> => {
  const { url } = getClientConfig();

  const params = new URLSearchParams({ limit: String(limit) });
  if (maxId) {
    params.set('max_id', maxId);
  }

  const response = await apiFetch(
    `https://${url}/api/v1/conversations?${params.toString()}`,
    { method: 'GET' }
  );

  const data = await response.json();
  return Array.isArray(data) ? data : [];
};

/**
 * Mark a conversation as read.
 * POST /api/v1/conversations/:id/read
 */
export const markConversationRead = async (
  id: string
): Promise<Conversation> => {
  const { url } = getClientConfig();

  const response = await apiFetch(
    `https://${url}/api/v1/conversations/${id}/read`,
    { method: 'POST' }
  );

  return response.json();
};

/**
 * Remove / hide a conversation from the list.
 * DELETE /api/v1/conversations/:id
 */
export const deleteConversation = async (id: string): Promise<void> => {
  const { url } = getClientConfig();

  await apiFetch(`https://${url}/api/v1/conversations/${id}`, {
    method: 'DELETE',
  });
};

/** @deprecated Use getConversations instead */
export const getMessages = getConversations;

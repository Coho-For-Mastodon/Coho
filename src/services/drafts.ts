import { del, get, set } from 'idb-keyval';

export interface DraftAttachment {
  id: string;
  preview_url: string;
  description: string | null;
  pending?: boolean;
  file?: File | Blob;
}

export interface DraftPost {
  id: string;
  status: string;
  visibility: string;
  sensitive: boolean;
  spoilerText: string;
  poll: { options: string[]; expiresIn: number; multiple: boolean } | null;
  replyToId: string | null;
  attachments: DraftAttachment[];
  updatedAt: string;
}

export function buildDraftKey({
  server,
  userId,
  replyToId,
}: {
  server: string;
  userId: string;
  replyToId?: string | null;
}): string {
  const replySegment = replyToId ? `reply:${replyToId}` : 'new';
  return `draft:${server}:${userId}:${replySegment}`;
}

export async function loadDraft(key: string): Promise<DraftPost | null> {
  const draft = await get<DraftPost>(key);
  return draft ?? null;
}

export async function saveDraft(key: string, draft: DraftPost): Promise<void> {
  await set(key, draft);
}

export async function deleteDraft(key: string): Promise<void> {
  await del(key);
}

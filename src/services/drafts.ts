import { del, entries, get, set } from 'idb-keyval';

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
  schedule: { date: string; time: string } | null;
  replyToId: string | null;
  attachments: DraftAttachment[];
  updatedAt: string;
}

export interface DraftPostInput {
  status: string;
  visibility: string;
  sensitive: boolean;
  spoilerText: string;
  poll: { options: string[]; expiresIn: number; multiple: boolean } | null;
  schedule: { date: string; time: string } | null;
  replyToId: string | null;
  attachments: DraftAttachment[];
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

function buildDraftEntryKey(contextKey: string, draftId: string): string {
  return `${contextKey}:entry:${draftId}`;
}

function isDraftPost(value: unknown): value is DraftPost {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<DraftPost>;
  return (
    typeof candidate.status === 'string' &&
    typeof candidate.visibility === 'string' &&
    typeof candidate.sensitive === 'boolean' &&
    typeof candidate.spoilerText === 'string' &&
    Array.isArray(candidate.attachments)
  );
}

function createDraftId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getDraftTime(updatedAt: string | undefined): number {
  if (!updatedAt) return 0;
  const parsed = Date.parse(updatedAt);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function listDraftsForContext(
  contextKey: string
): Promise<DraftPost[]> {
  const allEntries = await entries<string, unknown>();
  const entryPrefix = `${contextKey}:entry:`;

  return allEntries
    .filter(
      ([key]) =>
        typeof key === 'string' &&
        (key === contextKey || key.startsWith(entryPrefix))
    )
    .map(([key, value]) => {
      if (!isDraftPost(value)) return null;

      return {
        ...value,
        id: value.id?.trim() || key,
        schedule: value.schedule ?? null,
        updatedAt: value.updatedAt || new Date(0).toISOString(),
      };
    })
    .filter((draft): draft is DraftPost => draft !== null)
    .sort((a, b) => getDraftTime(b.updatedAt) - getDraftTime(a.updatedAt));
}

export async function saveDraftForContext(
  contextKey: string,
  draft: DraftPostInput
): Promise<DraftPost> {
  const savedDraft: DraftPost = {
    ...draft,
    id: createDraftId(),
    updatedAt: new Date().toISOString(),
  };

  await saveDraft(buildDraftEntryKey(contextKey, savedDraft.id), savedDraft);
  return savedDraft;
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

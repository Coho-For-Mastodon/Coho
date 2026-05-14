export const SCHEDULE_MIN_LEAD_MS = 5 * 60 * 1000;

export type LocalAttachmentType =
  | 'image'
  | 'video'
  | 'gifv'
  | 'audio'
  | 'unknown';

export interface LocalAttachment {
  id: string;
  preview_url: string;
  description: string | null;
  pending?: boolean;
  file?: File;
  type?: LocalAttachmentType;
}

export interface ComposerPollPayload {
  options: string[];
  expiresIn: number;
  multiple: boolean;
}

export interface ComposerSubmitEvent {
  status: string;
  attachments: LocalAttachment[];
  visibility: string;
  sensitive: boolean;
  spoilerText: string;
  poll: ComposerPollPayload | null;
  scheduledAt: string | null;
  replyToId: string | null;
  quotedStatusId: string | null;
}

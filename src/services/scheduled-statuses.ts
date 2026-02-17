import type { ScheduledStatus } from '../mastodon/types';
import {
  getScheduledStatuses as mastodonGetScheduledStatuses,
  updateScheduledStatus as mastodonUpdateScheduledStatus,
  deleteScheduledStatus as mastodonDeleteScheduledStatus,
} from '../mastodon/api/scheduled-statuses';

export const getScheduledStatuses = async (): Promise<ScheduledStatus[]> => {
  return mastodonGetScheduledStatuses({ limit: 40 });
};

export const updateScheduledStatus = async (
  id: string,
  scheduledAt: string
): Promise<ScheduledStatus> => {
  return mastodonUpdateScheduledStatus(id, scheduledAt);
};

export const deleteScheduledStatus = async (id: string): Promise<void> => {
  await mastodonDeleteScheduledStatus(id);
};

import { msg } from '@lit/localize';
import {
  getDefaultScheduleDateTime,
  resolveScheduledAtForSubmission,
} from './schedule';

export interface ScheduleControllerState {
  scheduleEnabled: boolean;
  scheduleDate: string;
  scheduleTime: string;
  scheduleError: string | null;
}

export interface ScheduleControllerHost {
  getState: () => ScheduleControllerState;
  setState: (patch: Partial<ScheduleControllerState>) => void;
  dispatchOpenScheduledStatuses: () => void;
}

export class PostComposerScheduleController {
  constructor(private host: ScheduleControllerHost) {}

  toggle() {
    const { scheduleEnabled, scheduleDate, scheduleTime } =
      this.host.getState();
    const nextEnabled = !scheduleEnabled;

    let nextDate = scheduleDate;
    let nextTime = scheduleTime;

    if (nextEnabled && (!scheduleDate || !scheduleTime)) {
      const nextSchedule = getDefaultScheduleDateTime();
      nextDate = nextSchedule.date;
      nextTime = nextSchedule.time;
    }

    this.host.setState({
      scheduleEnabled: nextEnabled,
      scheduleDate: nextDate,
      scheduleTime: nextTime,
      scheduleError: null,
    });
  }

  setDate(value: string) {
    this.host.setState({
      scheduleDate: value,
      scheduleError: null,
    });
  }

  setTime(value: string) {
    this.host.setState({
      scheduleTime: value,
      scheduleError: null,
    });
  }

  openScheduledStatuses() {
    this.host.dispatchOpenScheduledStatuses();
  }

  resolveScheduledAtForSubmission(): string | null {
    const { scheduleEnabled, scheduleDate, scheduleTime } =
      this.host.getState();

    const result = resolveScheduledAtForSubmission({
      scheduleEnabled,
      scheduleDate,
      scheduleTime,
    });

    switch (result.error) {
      case null:
        this.host.setState({ scheduleError: null });
        return result.scheduledAt;
      case 'missing':
        this.host.setState({ scheduleError: msg('Choose a date and time.') });
        return null;
      case 'invalid':
        this.host.setState({
          scheduleError: msg('Choose a valid date and time.'),
        });
        return null;
      case 'tooSoon':
        this.host.setState({
          scheduleError: msg(
            'Schedule your post at least 5 minutes in the future.'
          ),
        });
        return null;
      default:
        return null;
    }
  }

  reset() {
    this.host.setState({
      scheduleEnabled: false,
      scheduleDate: '',
      scheduleTime: '',
      scheduleError: null,
    });
  }
}

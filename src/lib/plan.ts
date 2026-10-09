export type TaskFile = {
  id: string;
  name: string;
  uri: string;
  mimeType: string | null;
};

export type RepeatKind = 'daily' | 'weekly' | 'interval' | 'monthly' | 'yearly';

export type Task = {
  id: string;
  date: string;
  title: string;
  done: boolean;
  createdAt: number;
  description: string;
  timeEnabled: boolean;
  hour: number;
  minute: number;
  reminderEnabled: boolean;
  reminderDate: string | null;
  reminderHour: number;
  reminderMinute: number;
  place: string;
  links: string[];
  files: TaskFile[];
  seriesId: string | null;
};

export const MAX_TASK_TITLE = 200;
export const MAX_TASK_DESCRIPTION = 2000;
export const MAX_TASK_PLACE = 200;
export const MAX_TASK_LINKS = 10;
export const MAX_TASK_LINK_LENGTH = 500;
export const MAX_TASK_FILES = 5;
export const MAX_TASK_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_REPEAT_COUNT = 100;
export const MIN_REPEAT_INTERVAL = 2;
export const MAX_REPEAT_INTERVAL = 60;

export type Settings = {
  appName: string;
  enabled: boolean;
  hour: number;
  minute: number;
  cycleEnabled: boolean;
  cycleStart: string | null;
  cycleLength: number;
};

export type ReminderCopy = {
  title: string;
  body: string;
};

export const MAX_APP_NAME = 40;

export const DEFAULT_SETTINGS: Settings = {
  appName: 'Yourbook',
  enabled: true,
  hour: 21,
  minute: 0,
  cycleEnabled: false,
  cycleStart: null,
  cycleLength: 28,
};

export const MIN_CYCLE_LENGTH = 15;
export const MAX_CYCLE_LENGTH = 60;

export const REMINDER_HORIZON_DAYS = 30;
const MAX_NOTIFICATION_TASKS = 8;

const WEEKDAY_SHORT = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'] as const;
const WEEKDAYS = [
  'воскресенье',
  'понедельник',
  'вторник',
  'среда',
  'четверг',
  'пятница',
  'суббота',
] as const;
const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

export const MONTHS_NOMINATIVE = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

export function formatMonthTitle(year: number, monthIndex: number): string {
  return `${MONTHS_NOMINATIVE[monthIndex]}, ${year}`;
}

export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDateKey(key: string): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function isDateKey(key: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
    return false;
  }
  return dateKey(parseDateKey(key)) === key;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function reminderDateForDay(anchorDate: string, reminderDate: string, day: string): string {
  const offset = daysBetween(parseDateKey(anchorDate), parseDateKey(reminderDate));
  return dateKey(addDays(parseDateKey(day), offset));
}

export function startOfWeek(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const weekday = start.getDay();
  const mondayOffset = weekday === 0 ? -6 : 1 - weekday;
  start.setDate(start.getDate() + mondayOffset);
  return start;
}

export function weekdayShort(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatDayHeading(key: string): string {
  const date = parseDateKey(key);
  return `${capitalize(WEEKDAYS[date.getDay()])}, ${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

export function formatCycleDate(key: string): string {
  const date = parseDateKey(key);
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function cycleLengthLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = 'дней';
  if (mod10 === 1 && mod100 !== 11) {
    word = 'день';
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    word = 'дня';
  }
  return `${count} ${word}`;
}

function daysBetween(from: Date, to: Date): number {
  const utc = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc(to) - utc(from)) / 86_400_000);
}

export function isCycleStart(key: string, settings: Settings): boolean {
  if (!settings.cycleEnabled || !settings.cycleStart || !isDateKey(key) || !isDateKey(settings.cycleStart)) {
    return false;
  }
  const length = settings.cycleLength;
  if (!Number.isInteger(length) || length < 1) {
    return false;
  }
  const diff = daysBetween(parseDateKey(settings.cycleStart), parseDateKey(key));
  return diff >= 0 && diff % length === 0;
}

export function cycleDropsBetween(from: Date, to: Date, settings: Settings): Set<string> {
  const drops = new Set<string>();
  if (!settings.cycleEnabled || !settings.cycleStart || !isDateKey(settings.cycleStart)) {
    return drops;
  }
  const length = settings.cycleLength;
  if (!Number.isInteger(length) || length < 1) {
    return drops;
  }
  const anchor = parseDateKey(settings.cycleStart);
  let cursor = anchor;
  if (cursor < from) {
    const steps = Math.floor(daysBetween(anchor, from) / length);
    cursor = addDays(anchor, steps * length);
    if (cursor < from) {
      cursor = addDays(cursor, length);
    }
  }
  const end = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  while (cursor.getTime() <= end) {
    drops.add(dateKey(cursor));
    cursor = addDays(cursor, length);
  }
  return drops;
}

export function relativeDayLabel(key: string, today: Date): string | null {
  const todayKey = dateKey(today);
  if (key === todayKey) {
    return 'Сегодня';
  }
  if (key === dateKey(addDays(today, 1))) {
    return 'Завтра';
  }
  if (key === dateKey(addDays(today, -1))) {
    return 'Вчера';
  }
  return null;
}

export function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function blankTaskFields(): Omit<Task, 'id' | 'date' | 'title' | 'done' | 'createdAt'> {
  return {
    description: '',
    timeEnabled: false,
    hour: 9,
    minute: 0,
    reminderEnabled: false,
    reminderDate: null,
    reminderHour: 9,
    reminderMinute: 0,
    place: '',
    links: [],
    files: [],
    seriesId: null,
  };
}

export function taskListText(task: Pick<Task, 'title' | 'timeEnabled' | 'hour' | 'minute'>): string {
  if (!task.timeEnabled) {
    return task.title;
  }
  return `${formatTime(task.hour, task.minute)}: ${task.title}`;
}

export function compareTasks(left: Task, right: Task): number {
  if (left.done !== right.done) {
    return Number(left.done) - Number(right.done);
  }
  if (left.timeEnabled !== right.timeEnabled) {
    return left.timeEnabled ? 1 : -1;
  }
  if (left.timeEnabled && right.timeEnabled) {
    const byTime = left.hour * 60 + left.minute - (right.hour * 60 + right.minute);
    if (byTime !== 0) {
      return byTime;
    }
  }
  return left.createdAt - right.createdAt;
}

export function hasLaterInSeries(tasks: readonly Task[], task: Task): boolean {
  return (
    task.seriesId !== null &&
    tasks.some((item) => item.seriesId === task.seriesId && item.id !== task.id && item.date >= task.date)
  );
}

export type RepeatResult = { ok: true; dates: string[] } | { ok: false; reason: 'until-before-start' | 'too-many' };

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function repeatDates(start: string, until: string, kind: RepeatKind, interval = MIN_REPEAT_INTERVAL): RepeatResult {
  if (!isDateKey(start) || !isDateKey(until) || until < start) {
    return { ok: false, reason: 'until-before-start' };
  }

  const dates: string[] = [];
  const push = (key: string): boolean => {
    dates.push(key);
    return dates.length > MAX_REPEAT_COUNT;
  };

  if (kind === 'daily' || kind === 'weekly' || kind === 'interval') {
    const step = kind === 'daily' ? 1 : kind === 'weekly' ? 7 : Math.min(MAX_REPEAT_INTERVAL, Math.max(MIN_REPEAT_INTERVAL, interval));
    let cursor = parseDateKey(start);
    while (dateKey(cursor) <= until) {
      if (push(dateKey(cursor))) {
        return { ok: false, reason: 'too-many' };
      }
      cursor = addDays(cursor, step);
    }
    return { ok: true, dates };
  }

  const origin = parseDateKey(start);
  const day = origin.getDate();
  const month = origin.getMonth();
  if (kind === 'yearly') {
    const untilYear = parseDateKey(until).getFullYear();
    for (let year = origin.getFullYear(); year <= untilYear && year <= 2100; year += 1) {
      if (day > daysInMonth(year, month)) {
        continue;
      }
      const key = dateKey(new Date(year, month, day));
      if (key < start) {
        continue;
      }
      if (key > until) {
        break;
      }
      if (push(key)) {
        return { ok: false, reason: 'too-many' };
      }
    }
    return { ok: true, dates };
  }

  let year = origin.getFullYear();
  let monthIndex = origin.getMonth();
  for (let guard = 0; guard < 2400 && year <= 2100; guard += 1) {
    if (dateKey(new Date(year, monthIndex, 1)) > until) {
      break;
    }
    if (day <= daysInMonth(year, monthIndex)) {
      const key = dateKey(new Date(year, monthIndex, day));
      if (key >= start && key <= until && push(key)) {
        return { ok: false, reason: 'too-many' };
      }
      if (key > until) {
        break;
      }
    }
    monthIndex += 1;
    if (monthIndex > 11) {
      monthIndex = 0;
      year += 1;
    }
  }
  return { ok: true, dates };
}

export function isReminderPast(date: string, hour: number, minute: number, now = new Date()): boolean {
  if (!isDateKey(date)) {
    return true;
  }
  const moment = parseDateKey(date);
  moment.setHours(hour, minute, 0, 0);
  return moment.getTime() <= now.getTime();
}

export function tasksCountLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  let word = 'задач';
  if (mod10 === 1 && mod100 !== 11) {
    word = 'задача';
  } else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    word = 'задачи';
  }
  return `${count} ${word}`;
}

export type DayDot = 'open' | 'done';

export function dayDots(tasks: Task[]): Map<string, DayDot> {
  const dots = new Map<string, DayDot>();
  for (const task of tasks) {
    if (!task.done) {
      dots.set(task.date, 'open');
    } else if (!dots.has(task.date)) {
      dots.set(task.date, 'done');
    }
  }
  return dots;
}

export function tasksStatusPhrase(dayTasks: Task[]): string {
  if (dayTasks.length === 0) {
    return 'Задач нет';
  }
  if (dayTasks.every((task) => task.done)) {
    return 'Все выполнено';
  }
  return tasksCountLabel(dayTasks.filter((task) => !task.done).length);
}

export function upcomingReminderMoments(
  now: Date,
  hour: number,
  minute: number,
  horizon = REMINDER_HORIZON_DAYS,
): Date[] {
  const first = new Date(now);
  first.setHours(hour, minute, 0, 0);
  if (first.getTime() <= now.getTime()) {
    first.setDate(first.getDate() + 1);
  }

  return Array.from({ length: horizon }, (_, index) => addDays(first, index));
}

function clip(value: string, max: number): string {
  const trimmed = value.trim();
  if (trimmed.length <= max) {
    return trimmed;
  }
  return `${trimmed.slice(0, max - 1)}…`;
}

export function reminderForMoment(moment: Date, tasks: Task[]): ReminderCopy | null {
  const targetKey = dateKey(addDays(moment, 1));
  const openTasks = tasks.filter((task) => task.date === targetKey && !task.done).sort(compareTasks);

  if (openTasks.length === 0) {
    return null;
  }

  const lines = openTasks.slice(0, MAX_NOTIFICATION_TASKS).map((task) => `• ${clip(taskListText(task), 80)}`);
  const hidden = openTasks.length - MAX_NOTIFICATION_TASKS;
  if (hidden > 0) {
    lines.push(`и ещё ${hidden}`);
  }

  return {
    title: `Завтра, ${parseDateKey(targetKey).getDate()} ${MONTHS[parseDateKey(targetKey).getMonth()]}`,
    body: lines.join('\n'),
  };
}

export function describeNextReminder(now: Date, settings: Settings, tasks: Task[]): string | null {
  if (!settings.enabled) {
    return null;
  }

  const next = upcomingReminderMoments(now, settings.hour, settings.minute).find((moment) =>
    reminderForMoment(moment, tasks),
  );

  if (!next) {
    return 'Пока нет задач, о которых нужно напомнить';
  }

  const time = formatTime(settings.hour, settings.minute);
  const relative = relativeDayLabel(dateKey(next), now);
  const when =
    relative === 'Сегодня' || relative === 'Завтра'
      ? `${relative} в ${time}`
      : `${formatDayHeading(dateKey(next))} в ${time}`;
  const taskDate = parseDateKey(dateKey(addDays(next, 1)));
  const taskLabel = `${taskDate.getDate()} ${MONTHS[taskDate.getMonth()]}`;

  return `${when} — задачи на ${taskLabel}`;
}

export function sanitizeSettings(value: unknown): Settings {
  if (!value || typeof value !== 'object') {
    return { ...DEFAULT_SETTINGS };
  }

  const record = value as Partial<Settings>;
  const hour = Number(record.hour);
  const minute = Number(record.minute);

  const cycleLength = Number(record.cycleLength);
  const cycleStart = typeof record.cycleStart === 'string' && isDateKey(record.cycleStart) ? record.cycleStart : null;

  const appName = typeof record.appName === 'string' ? record.appName.trim().slice(0, MAX_APP_NAME) : '';

  return {
    appName: appName.length > 0 ? appName : DEFAULT_SETTINGS.appName,
    enabled: typeof record.enabled === 'boolean' ? record.enabled : DEFAULT_SETTINGS.enabled,
    hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : DEFAULT_SETTINGS.hour,
    minute: Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : DEFAULT_SETTINGS.minute,
    cycleEnabled: typeof record.cycleEnabled === 'boolean' ? record.cycleEnabled : DEFAULT_SETTINGS.cycleEnabled,
    cycleStart,
    cycleLength:
      Number.isInteger(cycleLength) && cycleLength >= MIN_CYCLE_LENGTH && cycleLength <= MAX_CYCLE_LENGTH
        ? cycleLength
        : DEFAULT_SETTINGS.cycleLength,
  };
}

export function sanitizeTasks(value: unknown): Task[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') {
      return [];
    }

    const record = item as Partial<Task>;
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (
      typeof record.id !== 'string' ||
      typeof record.date !== 'string' ||
      !isDateKey(record.date) ||
      title.length === 0 ||
      typeof record.done !== 'boolean' ||
      typeof record.createdAt !== 'number'
    ) {
      return [];
    }

    const hour = Number(record.hour);
    const minute = Number(record.minute);
    const reminderHour = Number(record.reminderHour);
    const reminderMinute = Number(record.reminderMinute);
    const links = Array.isArray(record.links)
      ? record.links
          .filter((link): link is string => typeof link === 'string')
          .map((link) => link.trim().slice(0, MAX_TASK_LINK_LENGTH))
          .filter((link) => link.length > 0)
          .slice(0, MAX_TASK_LINKS)
      : [];
    const files = Array.isArray(record.files)
      ? record.files.flatMap((file) => {
          if (!file || typeof file !== 'object') {
            return [];
          }
          const item = file as Partial<TaskFile>;
          if (typeof item.id !== 'string' || typeof item.name !== 'string' || typeof item.uri !== 'string') {
            return [];
          }
          return [
            {
              id: item.id,
              name: item.name.slice(0, 120),
              uri: item.uri,
              mimeType: typeof item.mimeType === 'string' ? item.mimeType : null,
            },
          ];
        }).slice(0, MAX_TASK_FILES)
      : [];

    return [
      {
        ...blankTaskFields(),
        id: record.id,
        date: record.date,
        title: title.slice(0, MAX_TASK_TITLE),
        done: record.done,
        createdAt: record.createdAt,
        description: typeof record.description === 'string' ? record.description.trim().slice(0, MAX_TASK_DESCRIPTION) : '',
        timeEnabled: record.timeEnabled === true,
        hour: Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : 9,
        minute: Number.isInteger(minute) && minute >= 0 && minute <= 59 ? minute : 0,
        reminderEnabled: record.reminderEnabled === true,
        reminderDate: typeof record.reminderDate === 'string' && isDateKey(record.reminderDate) ? record.reminderDate : null,
        reminderHour: Number.isInteger(reminderHour) && reminderHour >= 0 && reminderHour <= 23 ? reminderHour : 9,
        reminderMinute: Number.isInteger(reminderMinute) && reminderMinute >= 0 && reminderMinute <= 59 ? reminderMinute : 0,
        place: typeof record.place === 'string' ? record.place.trim().slice(0, MAX_TASK_PLACE) : '',
        links,
        files,
        seriesId: typeof record.seriesId === 'string' && record.seriesId.length > 0 ? record.seriesId : null,
      },
    ];
  });
}

import * as Application from 'expo-application';
import { AndroidImportance } from 'expo-notifications/build/NotificationChannelManager.types';
import { getPermissionsAsync, requestPermissionsAsync } from 'expo-notifications/build/NotificationPermissions';
import { setNotificationHandler } from 'expo-notifications/build/NotificationsHandler';
import { SchedulableTriggerInputTypes } from 'expo-notifications/build/Notifications.types';
import { cancelScheduledNotificationAsync } from 'expo-notifications/build/cancelScheduledNotificationAsync';
import { getAllScheduledNotificationsAsync } from 'expo-notifications/build/getAllScheduledNotificationsAsync';
import { scheduleNotificationAsync } from 'expo-notifications/build/scheduleNotificationAsync';
import { setNotificationChannelAsync } from 'expo-notifications/build/setNotificationChannelAsync';
import { Linking, Platform } from 'react-native';

import { dateKey, isReminderPast, parseDateKey, reminderForMoment, upcomingReminderMoments, type ReminderCopy, type Settings, type Task } from '@/lib/plan';
import { loadFiredSlot, saveFiredSlot } from '@/lib/storage';

export const REMINDER_CHANNEL_ID = 'tomorrow-tasks-v3';
const TASK_CHANNEL_ID = 'task-reminder-v1';
const SCHEDULED_PREFIX = 'remind-day-';
const TASK_PREFIX = 'remind-task-';

export type ReminderStatus = 'granted' | 'denied' | 'web' | 'off';

const presentedSlots = new Set<string>();

if (Platform.OS !== 'web') {
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  await setNotificationChannelAsync(REMINDER_CHANNEL_ID, {
    name: 'Задачи на завтра',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: '#C6532A',
  });
  await setNotificationChannelAsync(TASK_CHANNEL_ID, {
    name: 'Напоминание о задаче',
    importance: AndroidImportance.MAX,
    vibrationPattern: [0, 250, 120, 250],
    lightColor: '#C6532A',
  });
}

async function hasPermission(): Promise<boolean> {
  const current = await getPermissionsAsync();
  return current.status === 'granted';
}

async function ensurePermission(): Promise<boolean> {
  if (await hasPermission()) {
    return true;
  }

  const requested = await requestPermissionsAsync();
  return requested.status === 'granted';
}

async function presentNow(identifier: string, copy: ReminderCopy): Promise<void> {
  await scheduleNotificationAsync({
    identifier,
    content: {
      title: copy.title,
      body: copy.body,
      sound: true,
      priority: 'max',
      color: '#C6532A',
    },
    trigger: { channelId: REMINDER_CHANNEL_ID },
  });
}

async function cancelByPrefix(prefix: string, keep: ReadonlySet<string>): Promise<void> {
  const existing = await getAllScheduledNotificationsAsync();
  await Promise.all(
    existing
      .filter((item) => item.identifier.startsWith(prefix) && !keep.has(item.identifier))
      .map((item) => cancelScheduledNotificationAsync(item.identifier)),
  );
}

async function scheduleTaskReminders(tasks: Task[]): Promise<void> {
  const keep = new Set<string>();
  for (const task of tasks) {
    if (task.done || !task.reminderEnabled || !task.reminderDate) {
      continue;
    }
    if (isReminderPast(task.reminderDate, task.reminderHour, task.reminderMinute)) {
      continue;
    }
    const moment = parseDateKey(task.reminderDate);
    moment.setHours(task.reminderHour, task.reminderMinute, 0, 0);
    const identifier = `${TASK_PREFIX}${task.id}`;
    keep.add(identifier);
    await scheduleNotificationAsync({
      identifier,
      content: {
        title: task.title,
        body: 'Напоминание',
        sound: true,
        priority: 'max',
        color: '#C6532A',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: moment,
        channelId: TASK_CHANNEL_ID,
      },
    });
  }
  await cancelByPrefix(TASK_PREFIX, keep);
}

export async function syncReminders(tasks: Task[], settings: Settings): Promise<ReminderStatus> {
  if (Platform.OS === 'web') {
    return 'web';
  }

  await ensureChannel();

  const granted = await ensurePermission();
  if (!granted) {
    return 'denied';
  }

  if (!settings.enabled) {
    await cancelByPrefix(SCHEDULED_PREFIX, new Set());
    await scheduleTaskReminders(tasks);
    return 'off';
  }

  const keep = new Set<string>();
  const moments = upcomingReminderMoments(new Date(), settings.hour, settings.minute);
  for (const moment of moments) {
    const copy = reminderForMoment(moment, tasks);
    if (!copy) {
      continue;
    }

    const identifier = `${SCHEDULED_PREFIX}${moment.getTime()}`;
    keep.add(identifier);
    await scheduleNotificationAsync({
      identifier,
      content: {
        title: copy.title,
        body: copy.body,
        sound: true,
        priority: 'max',
        color: '#C6532A',
      },
      trigger: {
        type: SchedulableTriggerInputTypes.DATE,
        date: moment,
        channelId: REMINDER_CHANNEL_ID,
      },
    });
  }

  await cancelByPrefix(SCHEDULED_PREFIX, keep);
  await scheduleTaskReminders(tasks);
  return 'granted';
}

export async function presentDueReminder(tasks: Task[], settings: Settings): Promise<void> {
  if (Platform.OS === 'web' || !settings.enabled) {
    return;
  }

  const now = new Date();
  const slot = new Date(now);
  slot.setHours(settings.hour, settings.minute, 0, 0);
  if (now.getTime() < slot.getTime()) {
    return;
  }

  const slotKey = dateKey(now);
  if (presentedSlots.has(slotKey) || (await loadFiredSlot()) === slotKey) {
    presentedSlots.add(slotKey);
    return;
  }

  const copy = reminderForMoment(slot, tasks);
  if (!copy || !(await hasPermission())) {
    return;
  }

  presentedSlots.add(slotKey);
  try {
    await ensureChannel();
    await cancelScheduledNotificationAsync(`${SCHEDULED_PREFIX}${slot.getTime()}`).catch(() => undefined);
    await presentNow(`remind-due-${slotKey}`, copy);
    await saveFiredSlot(slotKey);
  } catch (error) {
    presentedSlots.delete(slotKey);
    throw error;
  }
}

export async function sendTestReminder(
  tasks: Task[],
  settings: Settings,
  report: (message: string) => void,
): Promise<ReminderStatus> {
  if (Platform.OS === 'web') {
    return 'web';
  }

  await ensureChannel();
  const granted = await ensurePermission();
  if (!granted) {
    return 'denied';
  }

  const next = upcomingReminderMoments(new Date(), settings.hour, settings.minute).find((moment) =>
    reminderForMoment(moment, tasks),
  );
  const copy = (next && reminderForMoment(next, tasks)) || {
    title: settings.appName,
    body: 'Напоминания работают. На ближайшие дни открытых задач нет.',
  };

  setTimeout(() => {
    void presentNow(`remind-test-${Date.now()}`, copy)
      .then(() => {
        report('Пробное уведомление отправлено. Если его не видно на экране, откройте шторку уведомлений.');
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : '';
        report(detail ? `Не удалось показать уведомление. ${detail}` : 'Не удалось показать уведомление.');
      });
  }, 5000);

  return 'granted';
}

export async function openNotificationSettings(): Promise<void> {
  await Linking.openSettings();
}

export async function openExactAlarmSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await Linking.openSettings();
    return;
  }

  const packageName = Application.applicationId;
  try {
    await Linking.sendIntent(
      'android.settings.REQUEST_SCHEDULE_EXACT_ALARM',
      packageName ? [{ key: 'android.provider.extra.APP_PACKAGE', value: packageName }] : undefined,
    );
  } catch {
    await Linking.openSettings();
  }
}

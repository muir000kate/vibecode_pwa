import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { forgetUnusedFiles } from '@/lib/taskFiles';
import {
  blankTaskFields,
  DEFAULT_SETTINGS,
  isDateKey,
  MAX_TASK_DESCRIPTION,
  MAX_TASK_FILES,
  MAX_TASK_LINK_LENGTH,
  MAX_TASK_LINKS,
  MAX_TASK_PLACE,
  MAX_TASK_TITLE,
  reminderDateForDay,
  repeatDates,
  type RepeatKind,
  type Settings,
  type Task,
  type TaskFile,
} from '@/lib/plan';
import { presentDueReminder, sendTestReminder, syncReminders, type ReminderStatus } from '@/lib/reminders';
import { loadSettings, loadTasks, saveSettings, saveTasks } from '@/lib/storage';

type TasksContextValue = {
  ready: boolean;
  tasks: Task[];
  settings: Settings;
  permission: ReminderStatus | 'unknown';
  reminderError: string | null;
  testMessage: string | null;
  addTask: (date: string, title: string) => Promise<void>;
  createDetailedTask: (date: string, draft: TaskDraft, repeat: RepeatDraft | null) => Promise<CreateTaskResult>;
  saveTaskDetails: (id: string, draft: TaskDraft, scope: 'one' | 'following') => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  deleteFollowingTasks: (id: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  sendTest: () => Promise<void>;
};

export type TaskDraft = {
  title: string;
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
};

export type RepeatDraft = {
  kind: RepeatKind;
  interval: number;
  until: string;
};

export type CreateTaskResult = 'saved' | 'empty-title' | 'until-before-start' | 'too-many';

const TasksContext = createContext<TasksContextValue | null>(null);

function cleanDraft(draft: TaskDraft): TaskDraft | null {
  const title = draft.title.trim().slice(0, MAX_TASK_TITLE);
  if (title.length === 0) {
    return null;
  }
  return {
    ...draft,
    title,
    description: draft.description.trim().slice(0, MAX_TASK_DESCRIPTION),
    place: draft.place.trim().slice(0, MAX_TASK_PLACE),
    links: draft.links
      .map((link) => link.trim().slice(0, MAX_TASK_LINK_LENGTH))
      .filter((link) => link.length > 0)
      .slice(0, MAX_TASK_LINKS),
    files: draft.files.slice(0, MAX_TASK_FILES),
    reminderDate: draft.reminderEnabled ? draft.reminderDate : null,
  };
}

const initialSettings: Settings = { ...DEFAULT_SETTINGS };

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function TasksProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [permission, setPermission] = useState<ReminderStatus | 'unknown'>('unknown');
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const tasksRef = useRef(tasks);
  const settingsRef = useRef(settings);
  const readyRef = useRef(false);
  const syncChain = useRef<Promise<void>>(Promise.resolve());

  tasksRef.current = tasks;
  settingsRef.current = settings;

  function enqueueSync(): void {
    syncChain.current = syncChain.current
      .then(async () => {
        const status = await syncReminders(tasksRef.current, settingsRef.current);
        setPermission(status);
        setReminderError(null);
        await presentDueReminder(tasksRef.current, settingsRef.current);
      })
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : '';
        setReminderError(
          detail
            ? `Не получилось запланировать уведомление. ${detail}`
            : 'Не получилось запланировать уведомление. Разрешите уведомления для Expo Go.',
        );
      });
  }

  async function commitTasks(next: Task[]): Promise<void> {
    tasksRef.current = next;
    setTasks(next);
    await saveTasks(next);
    enqueueSync();
    void forgetUnusedFiles(next).catch(() => undefined);
  }

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const [storedTasks, storedSettings] = await Promise.all([loadTasks(), loadSettings()]);
        if (!active) {
          return;
        }
        tasksRef.current = storedTasks;
        settingsRef.current = storedSettings;
        setTasks(storedTasks);
        setSettings(storedSettings);
      } finally {
        if (active) {
          readyRef.current = true;
          setReady(true);
          enqueueSync();
        }
      }
    })();

    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active' && readyRef.current) {
        enqueueSync();
      }
    });

    const timer = setInterval(() => {
      if (!readyRef.current || AppState.currentState !== 'active') {
        return;
      }
      void presentDueReminder(tasksRef.current, settingsRef.current).catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : '';
        setReminderError(detail ? `Не получилось показать напоминание. ${detail}` : 'Не получилось показать напоминание.');
      });
    }, 15000);

    return () => {
      active = false;
      subscription.remove();
      clearInterval(timer);
    };
  }, []);

  const value = useMemo<TasksContextValue>(
    () => ({
      ready,
      tasks,
      settings,
      permission,
      reminderError,
      testMessage,
      addTask: async (date, title) => {
        const nextTitle = title.trim().slice(0, 200);
        if (!isDateKey(date) || nextTitle.length === 0) {
          return;
        }
        await commitTasks([
          ...tasksRef.current,
          { id: createId(), date, title: nextTitle, done: false, createdAt: Date.now(), ...blankTaskFields() },
        ]);
      },
      createDetailedTask: async (date, draft, repeat) => {
        const cleaned = cleanDraft(draft);
        if (!cleaned || !isDateKey(date)) {
          return 'empty-title';
        }
        let dates = [date];
        if (repeat) {
          const result = repeatDates(date, repeat.until, repeat.kind, repeat.interval);
          if (!result.ok) {
            return result.reason;
          }
          dates = result.dates;
        }
        const seriesId = dates.length > 1 ? createId() : null;
        const now = Date.now();
        const created: Task[] = dates.map((day, index) => ({
          ...blankTaskFields(),
          ...cleaned,
          id: createId(),
          date: day,
          done: false,
          createdAt: now + index,
          seriesId,
          reminderDate: cleaned.reminderEnabled
            ? dates.length > 1
              ? reminderDateForDay(date, cleaned.reminderDate ?? date, day)
              : cleaned.reminderDate ?? day
            : null,
        }));
        await commitTasks([...tasksRef.current, ...created]);
        return 'saved';
      },
      saveTaskDetails: async (id, draft, scope) => {
        const cleaned = cleanDraft(draft);
        const current = tasksRef.current.find((task) => task.id === id);
        if (!cleaned || !current) {
          return;
        }
        const targetIds = new Set(
          scope === 'following' && current.seriesId
            ? tasksRef.current.filter((task) => task.seriesId === current.seriesId && task.date >= current.date).map((task) => task.id)
            : [id],
        );
        await commitTasks(
          tasksRef.current.map((task) => {
            if (!targetIds.has(task.id)) {
              return task;
            }
            return {
              ...task,
              ...cleaned,
              reminderDate: cleaned.reminderEnabled
                ? scope === 'following'
                  ? reminderDateForDay(current.date, cleaned.reminderDate ?? current.date, task.date)
                  : cleaned.reminderDate
                : null,
            };
          }),
        );
      },
      toggleTask: async (id) => {
        await commitTasks(tasksRef.current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)));
      },
      deleteTask: async (id) => {
        await commitTasks(tasksRef.current.filter((task) => task.id !== id));
      },
      deleteFollowingTasks: async (id) => {
        const current = tasksRef.current.find((task) => task.id === id);
        if (!current) {
          return;
        }
        const seriesId = current.seriesId;
        await commitTasks(
          tasksRef.current.filter((task) => {
            if (task.id === id) {
              return false;
            }
            return !(seriesId && task.seriesId === seriesId && task.date >= current.date);
          }),
        );
      },
      updateSettings: async (nextSettings) => {
        settingsRef.current = nextSettings;
        setSettings(nextSettings);
        setTestMessage(null);
        await saveSettings(nextSettings);
        enqueueSync();
      },
      sendTest: async () => {
        setTestMessage(null);
        try {
          const status = await sendTestReminder(tasksRef.current, settingsRef.current, setTestMessage);
          if (status !== 'web') {
            setPermission(status);
          }
          if (status === 'web') {
            setTestMessage('Пробное уведомление можно отправить только с телефона.');
            return;
          }
          if (status === 'denied') {
            setTestMessage('Разрешите уведомления, чтобы проверить напоминание.');
            return;
          }
          setTestMessage('Пробное уведомление придёт через 5 секунд. Оставьте приложение открытым.');
        } catch (error) {
          const detail = error instanceof Error ? error.message : '';
          setTestMessage(detail ? `Не удалось отправить пробное уведомление. ${detail}` : 'Не удалось отправить пробное уведомление.');
        }
      },
    }),
    [permission, ready, reminderError, settings, tasks, testMessage],
  );

  return <TasksContext.Provider value={value}>{children}</TasksContext.Provider>;
}

export function useTasks(): TasksContextValue {
  const value = useContext(TasksContext);
  if (!value) {
    throw new Error('useTasks должен вызываться внутри TasksProvider');
  }
  return value;
}

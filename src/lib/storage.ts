import AsyncStorage from '@react-native-async-storage/async-storage';

import { sanitizeSettings, sanitizeTasks, type Settings, type Task } from '@/lib/plan';

const TASKS_KEY = 'remind.tasks.v1';
const SETTINGS_KEY = 'remind.settings.v1';
const FIRED_KEY = 'remind.fired.v1';

export async function loadTasks(): Promise<Task[]> {
  const raw = await AsyncStorage.getItem(TASKS_KEY);
  if (!raw) {
    return [];
  }

  try {
    return sanitizeTasks(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return sanitizeSettings(undefined);
  }

  try {
    return sanitizeSettings(JSON.parse(raw));
  } catch {
    return sanitizeSettings(undefined);
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export async function loadFiredSlot(): Promise<string | null> {
  return AsyncStorage.getItem(FIRED_KEY);
}

export async function saveFiredSlot(slot: string): Promise<void> {
  await AsyncStorage.setItem(FIRED_KEY, slot);
}

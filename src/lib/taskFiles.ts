import { Directory, File, Paths } from 'expo-file-system';
import { startActivityAsync } from 'expo-intent-launcher';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Task, TaskFile } from '@/lib/plan';

const FOLDER_NAME = 'task-files';

function folder(): Directory {
  const directory = new Directory(Paths.document, FOLDER_NAME);
  if (!directory.exists) {
    directory.create();
  }
  return directory;
}

export async function storeTaskFile(sourceUri: string, name: string): Promise<string> {
  const safeName = name.replace(/[^\w.\-]+/g, '_').slice(-48) || 'file';
  const destination = new File(folder(), `${Date.now().toString(36)}-${safeName}`);
  await new File(sourceUri).copy(destination);
  return destination.uri;
}

export async function openTaskFile(file: TaskFile): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await startActivityAsync('android.intent.action.VIEW', {
        data: file.uri,
        flags: 1,
        type: file.mimeType ?? '*/*',
      });
      return;
    } catch {
      // The private file can be opened through the share sheet.
    }
  }
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: file.mimeType ?? undefined,
      dialogTitle: file.name,
    });
  }
}

export async function forgetUnusedFiles(tasks: readonly Task[]): Promise<void> {
  const directory = new Directory(Paths.document, FOLDER_NAME);
  if (!directory.exists) {
    return;
  }
  const used = new Set(tasks.flatMap((task) => task.files.map((file) => file.uri)));
  for (const entry of directory.list()) {
    if (entry instanceof File && !used.has(entry.uri)) {
      entry.delete();
    }
  }
}

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { taskListText, type Task } from '@/lib/plan';
import { theme } from '@/theme';

type TaskRowProps = {
  task: Task;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
};

export function TaskRow({ task, onToggle, onEdit, onDelete }: TaskRowProps) {
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={task.done ? 'Отметить как несделанную' : 'Отметить как сделанную'}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: task.done }}
        onPress={() => onToggle(task.id)}
        style={[styles.check, task.done && styles.checkDone]}
      >
        {task.done ? <Text style={styles.checkMark}>✓</Text> : null}
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => onEdit(task)} style={styles.titleButton}>
        <Text style={[styles.title, task.done && styles.titleDone]}>{taskListText(task)}</Text>
      </Pressable>
      <Pressable accessibilityLabel="Удалить задачу" accessibilityRole="button" onPress={() => onDelete(task)} style={styles.delete}>
        <Text style={styles.deleteText}>×</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.card,
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: theme.line,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: {
    backgroundColor: theme.accent,
  },
  checkMark: {
    color: theme.white,
    fontSize: 14,
    fontWeight: '700',
  },
  titleButton: {
    flex: 1,
  },
  title: {
    color: theme.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  titleDone: {
    color: theme.muted,
    textDecorationLine: 'line-through',
  },
  delete: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: theme.muted,
    fontSize: 24,
    lineHeight: 26,
  },
});

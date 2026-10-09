import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { AppHeader } from '@/components/AppHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CycleNotice } from '@/components/CycleNotice';
import { ScreenFrame } from '@/components/ScreenFrame';
import { TaskComposer } from '@/components/TaskComposer';
import { TaskRow } from '@/components/TaskRow';
import { WeekStrip } from '@/components/WeekStrip';
import {
  addDays,
  compareTasks,
  cycleDropsBetween,
  dateKey,
  dayDots,
  formatDayHeading,
  hasLaterInSeries,
  isCycleStart,
  isDateKey,
  relativeDayLabel,
  tasksStatusPhrase,
  type Task,
} from '@/lib/plan';
import { useTasks } from '@/lib/store';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { theme } from '@/theme';

export default function TasksScreen() {
  const params = useLocalSearchParams<{ date?: string }>();
  const paramDate = typeof params.date === 'string' && isDateKey(params.date) ? params.date : dateKey(new Date());
  const { ready, tasks, settings, addTask, toggleTask, deleteTask, deleteFollowingTasks } = useTasks();
  const today = dateKey(new Date());
  const [selected, setSelected] = useState(paramDate);
  const [draft, setDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const keyboardHeight = useKeyboardInset();

  useEffect(() => {
    setSelected(paramDate);
  }, [paramDate]);

  useEffect(() => {
    setDraft('');
  }, [selected]);

  const dots = useMemo(() => dayDots(tasks), [tasks]);
  const drops = useMemo(() => cycleDropsBetween(addDays(new Date(), -40), addDays(new Date(), 140), settings), [settings]);
  const showCycle = isCycleStart(selected, settings);
  const dayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.date === selected)
        .sort(compareTasks),
    [selected, tasks],
  );
  const relative = relativeDayLabel(selected, new Date());

  if (!ready) {
    return (
      <ScreenFrame>
        <AppHeader back />
      </ScreenFrame>
    );
  }

  async function submit(): Promise<void> {
    await addTask(selected, draft);
    setDraft('');
  }

  function openTask(task: Task): void {
    router.push({ pathname: '/task-form', params: { id: task.id } });
  }

  function openDetails(): void {
    router.push({ pathname: '/task-form', params: { date: selected, draft } });
    setDraft('');
  }

  return (
    <ScreenFrame>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <AppHeader back />
        <WeekStrip dots={dots} drops={drops} onSelect={setSelected} selected={selected} today={today} />
        <View style={styles.heading}>
          {relative ? <Text style={styles.eyebrow}>{relative}</Text> : null}
          <Text style={styles.dayTitle}>{formatDayHeading(selected)}</Text>
          <Text style={styles.summary}>{tasksStatusPhrase(dayTasks)}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" style={styles.flex}>
          {showCycle ? <CycleNotice /> : null}
          {dayTasks.map((task) => (
            <TaskRow
              key={task.id}
              onDelete={setPendingDelete}
              onEdit={openTask}
              onToggle={(id) => {
                void toggleTask(id);
              }}
              task={task}
            />
          ))}
        </ScrollView>
        <TaskComposer
          onChange={setDraft}
          onDetails={openDetails}
          onSubmit={() => {
            void submit();
          }}
          value={draft}
        />
      </View>
      <ConfirmDialog
        choices={
          pendingDelete && hasLaterInSeries(tasks, pendingDelete)
            ? [
                {
                  label: 'Только эту',
                  onPress: () => {
                    void deleteTask(pendingDelete.id);
                    setPendingDelete(null);
                  },
                },
                {
                  label: 'Все последующие',
                  tone: 'danger',
                  onPress: () => {
                    void deleteFollowingTasks(pendingDelete.id);
                    setPendingDelete(null);
                  },
                },
              ]
            : [
                { label: 'Нет', onPress: () => setPendingDelete(null) },
                {
                  label: 'Да',
                  tone: 'danger',
                  onPress: () => {
                    if (pendingDelete) {
                      void deleteTask(pendingDelete.id);
                    }
                    setPendingDelete(null);
                  },
                },
              ]
        }
        onClose={() => setPendingDelete(null)}
        title={pendingDelete && hasLaterInSeries(tasks, pendingDelete) ? 'Удалить все связанные задачи?' : 'Удалить задачу?'}
        visible={pendingDelete !== null}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  heading: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 4,
  },
  eyebrow: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  dayTitle: {
    color: theme.ink,
    fontSize: 22,
    fontWeight: '700',
    marginTop: 2,
  },
  summary: {
    color: theme.muted,
    marginTop: 4,
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 10,
  },
});

import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { AppHeader } from '@/components/AppHeader';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CycleNotice } from '@/components/CycleNotice';
import { MonthCalendar } from '@/components/MonthCalendar';
import { ScreenFrame } from '@/components/ScreenFrame';
import { TaskComposer } from '@/components/TaskComposer';
import { TaskRow } from '@/components/TaskRow';
import { compareTasks, cycleDropsBetween, dateKey, dayDots, formatDayHeading, hasLaterInSeries, isCycleStart, tasksStatusPhrase, type Task } from '@/lib/plan';
import { useTasks } from '@/lib/store';
import { useKeyboardInset } from '@/lib/useKeyboardInset';

export default function HomeScreen() {
  const { ready, tasks, settings, addTask, toggleTask, deleteTask, deleteFollowingTasks } = useTasks();
  const today = dateKey(new Date());
  const todayDate = new Date();
  const [year, setYear] = useState(todayDate.getFullYear());
  const [month, setMonth] = useState(todayDate.getMonth());
  const [draft, setDraft] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Task | null>(null);
  const keyboardHeight = useKeyboardInset();

  const dots = useMemo(() => dayDots(tasks), [tasks]);
  const drops = useMemo(
    () => cycleDropsBetween(new Date(year, month, 1), new Date(year, month + 1, 0), settings),
    [month, settings, year],
  );
  const showCycle = isCycleStart(today, settings);
  const todayTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.date === today)
        .sort(compareTasks),
    [tasks, today],
  );

  if (!ready) {
    return (
      <ScreenFrame>
        <View style={styles.loading}>
          <AppHeader />
        </View>
      </ScreenFrame>
    );
  }

  async function submit(): Promise<void> {
    await addTask(today, draft);
    setDraft('');
  }

  function openTask(task: Task): void {
    router.push({ pathname: '/task-form', params: { id: task.id } });
  }

  function openDetails(): void {
    router.push({ pathname: '/task-form', params: { date: today, draft } });
    setDraft('');
  }

  return (
    <ScreenFrame>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <AppHeader detail={tasksStatusPhrase(todayTasks)} subtitle={formatDayHeading(today)} />
        <MonthCalendar
          dots={dots}
          drops={drops}
          month={month}
          onChange={(nextYear, nextMonth) => {
            setYear(nextYear);
            setMonth(nextMonth);
          }}
          onSelectDay={(date) => {
            router.push({ pathname: '/tasks', params: { date } });
          }}
          year={year}
        />
        <ScrollView contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" style={styles.flex}>
            {showCycle ? <CycleNotice /> : null}
            {todayTasks.map((task) => (
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
  loading: {
    flex: 1,
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
    gap: 10,
  },
});

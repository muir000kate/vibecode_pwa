import assert from 'node:assert/strict';
import test from 'node:test';

import {
  dateKey,
  cycleDropsBetween,
  compareTasks,
  cycleLengthLabel,
  DEFAULT_SETTINGS,
  describeNextReminder,
  isCycleStart,
  isDateKey,
  reminderForMoment,
  sanitizeSettings,
  sanitizeTasks,
  startOfWeek,
  dayDots,
  tasksCountLabel,
  tasksStatusPhrase,
  reminderDateForDay,
  repeatDates,
  taskListText,
  upcomingReminderMoments,
  type Task,
} from './plan.ts';

const task = (patch: Partial<Task> & Pick<Task, 'id' | 'date' | 'title'>): Task => ({
  done: false,
  createdAt: 1,
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
  ...patch,
});

test('date key uses the local calendar', () => {
  assert.equal(dateKey(new Date(2026, 9, 8, 23, 30)), '2026-10-08');
});

test('rejects impossible dates', () => {
  assert.equal(isDateKey('2026-02-31'), false);
  assert.equal(isDateKey('2026-10-08'), true);
});

test('week starts on Monday', () => {
  assert.equal(dateKey(startOfWeek(new Date(2026, 9, 8))), '2026-10-05');
  assert.equal(dateKey(startOfWeek(new Date(2026, 9, 11))), '2026-10-05');
});

test('before the chosen time, the first reminder is today', () => {
  const moments = upcomingReminderMoments(new Date(2026, 9, 8, 18, 0, 0), 21, 0, 2);
  assert.equal(dateKey(moments[0]), '2026-10-08');
  assert.equal(moments[0].getHours(), 21);
  assert.equal(moments[0].getMinutes(), 0);
  assert.equal(dateKey(moments[1]), '2026-10-09');
});

test('at or after the chosen time, the first reminder is tomorrow', () => {
  const exact = upcomingReminderMoments(new Date(2026, 9, 8, 21, 0, 0), 21, 0, 1);
  const stillToday = upcomingReminderMoments(new Date(2026, 9, 8, 21, 5, 0), 21, 30, 1);
  const passed = upcomingReminderMoments(new Date(2026, 9, 8, 21, 31, 0), 21, 30, 1);
  assert.equal(dateKey(exact[0]), '2026-10-09');
  assert.equal(dateKey(stillToday[0]), '2026-10-08');
  assert.equal(stillToday[0].getMinutes(), 30);
  assert.equal(dateKey(passed[0]), '2026-10-09');
});

test('reminder lists only open tasks for the next day', () => {
  const copy = reminderForMoment(new Date(2026, 9, 8, 21, 0, 0), [
    task({ id: '1', date: '2026-10-09', title: 'Купить молоко', createdAt: 2 }),
    task({ id: '2', date: '2026-10-09', title: 'Уже сделано', done: true, createdAt: 1 }),
    task({ id: '3', date: '2026-10-08', title: 'Сегодняшняя', createdAt: 3 }),
  ]);

  assert.ok(copy);
  assert.equal(copy?.title, 'Завтра, 9 октября');
  assert.match(copy?.body ?? '', /Купить молоко/);
  assert.doesNotMatch(copy?.body ?? '', /Уже сделано/);
  assert.doesNotMatch(copy?.body ?? '', /Сегодняшняя/);
});

test('skips a reminder when the next day has no open tasks', () => {
  assert.equal(reminderForMoment(new Date(2026, 9, 8, 21, 0, 0), []), null);
});

test('folds a long task list', () => {
  const tasks = Array.from({ length: 10 }, (_, index) =>
    task({ id: String(index), date: '2026-10-09', title: `Задача ${index + 1}`, createdAt: index }),
  );
  const copy = reminderForMoment(new Date(2026, 9, 8, 21, 0, 0), tasks);
  assert.match(copy?.body ?? '', /Задача 8/);
  assert.doesNotMatch(copy?.body ?? '', /Задача 9/);
  assert.match(copy?.body ?? '', /и ещё 2/);
});

test('describes the next evening that actually has tasks', () => {
  const text = describeNextReminder(new Date(2026, 9, 8, 18, 0, 0), { ...DEFAULT_SETTINGS, hour: 21, minute: 0 }, [
    task({ id: '1', date: '2026-10-10', title: 'Встреча' }),
  ]);
  assert.equal(text, 'Завтра в 21:00 — задачи на 10 октября');
});

test('a task on the 13th is announced the evening before, not on the 13th', () => {
  const text = describeNextReminder(new Date(2026, 9, 8, 12, 0, 0), { ...DEFAULT_SETTINGS, hour: 21, minute: 0 }, [
    task({ id: '1', date: '2026-10-13', title: 'Встреча' }),
  ]);
  assert.equal(text, 'Понедельник, 12 октября в 21:00 — задачи на 13 октября');
});

test('today is the next reminder when tomorrow already has a task', () => {
  const text = describeNextReminder(new Date(2026, 9, 8, 12, 0, 0), { ...DEFAULT_SETTINGS, hour: 21, minute: 0 }, [
    task({ id: '1', date: '2026-10-09', title: 'Молоко' }),
  ]);
  assert.equal(text, 'Сегодня в 21:00 — задачи на 9 октября');
});

test('drops broken stored tasks', () => {
  const tasks = sanitizeTasks([
    { id: 'ok', date: '2026-10-08', title: '  Позвонить  ', done: false, createdAt: 1 },
    { id: 'bad', date: '2026-02-31', title: 'Нет', done: false, createdAt: 2 },
    { id: 'empty', date: '2026-10-08', title: '   ', done: false, createdAt: 3 },
  ]);
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0]?.id, 'ok');
  assert.equal(tasks[0]?.title, 'Позвонить');
});

test('uses Russian plural forms', () => {
  assert.equal(tasksCountLabel(1), '1 задача');
  assert.equal(tasksCountLabel(2), '2 задачи');
  assert.equal(tasksCountLabel(5), '5 задач');
  assert.equal(tasksCountLabel(11), '11 задач');
  assert.equal(tasksCountLabel(21), '21 задача');
});

test('describes an empty, finished, or open day', () => {
  assert.equal(tasksStatusPhrase([]), 'Задач нет');
  assert.equal(tasksStatusPhrase([task({ id: '1', date: '2026-10-08', title: 'Купить хлеб', done: true })]), 'Все выполнено');
  assert.equal(
    tasksStatusPhrase([
      task({ id: '1', date: '2026-10-08', title: 'Купить хлеб', done: true }),
      task({ id: '2', date: '2026-10-08', title: 'Позвонить' }),
    ]),
    '1 задача',
  );
});

test('marks a finished day with a gray dot and an open day with a color dot', () => {
  const dots = dayDots([
    task({ id: '1', date: '2026-10-08', title: 'Готово', done: true }),
    task({ id: '2', date: '2026-10-09', title: 'Еще одна', done: true }),
    task({ id: '3', date: '2026-10-09', title: 'Открытая' }),
  ]);
  assert.equal(dots.get('2026-10-08'), 'done');
  assert.equal(dots.get('2026-10-09'), 'open');
  assert.equal(dots.has('2026-10-10'), false);
});

test('marks cycle starts from the chosen day and keeps the length', () => {
  const settings = { ...DEFAULT_SETTINGS, cycleEnabled: true, cycleStart: '2026-10-08', cycleLength: 28 };
  assert.equal(isCycleStart('2026-10-08', settings), true);
  assert.equal(isCycleStart('2026-11-05', settings), true);
  assert.equal(isCycleStart('2026-10-09', settings), false);
  assert.equal(isCycleStart('2026-09-10', settings), false);
  assert.equal(isCycleStart('2026-10-08', { ...settings, cycleEnabled: false }), false);
  assert.equal(cycleLengthLabel(28), '28 дней');
  assert.equal(cycleLengthLabel(21), '21 день');
  const drops = cycleDropsBetween(new Date(2026, 9, 1), new Date(2026, 10, 30), settings);
  assert.equal(drops.has('2026-10-08'), true);
  assert.equal(drops.has('2026-11-05'), true);
  assert.equal(drops.has('2026-10-01'), false);
});

test('lists a timed task with the clock before the title and keeps untimed tasks first', () => {
  assert.equal(taskListText(task({ id: '1', date: '2026-10-08', title: 'Купить хлеб' })), 'Купить хлеб');
  assert.equal(
    taskListText(task({ id: '2', date: '2026-10-08', title: 'Собрание', timeEnabled: true, hour: 14, minute: 30 })),
    '14:30: Собрание',
  );
  const ordered = [
    task({ id: 'late', date: '2026-10-08', title: 'Позже', timeEnabled: true, hour: 18, minute: 0, createdAt: 1 }),
    task({ id: 'plain', date: '2026-10-08', title: 'Без времени', createdAt: 3 }),
    task({ id: 'early', date: '2026-10-08', title: 'Раньше', timeEnabled: true, hour: 9, minute: 15, createdAt: 2 }),
    task({ id: 'done', date: '2026-10-08', title: 'Готово', done: true, createdAt: 0 }),
  ].sort(compareTasks);
  assert.deepEqual(
    ordered.map((item) => item.id),
    ['plain', 'early', 'late', 'done'],
  );
});

test('keeps the same reminder offset on every repeated day', () => {
  assert.equal(reminderDateForDay('2026-10-10', '2026-10-09', '2026-10-10'), '2026-10-09');
  assert.equal(reminderDateForDay('2026-10-10', '2026-10-09', '2026-10-17'), '2026-10-16');
  assert.equal(reminderDateForDay('2026-10-10', '2026-10-10', '2026-10-17'), '2026-10-17');
  assert.equal(reminderDateForDay('2026-01-31', '2026-02-01', '2026-03-31'), '2026-04-01');
});

test('creates weekly tasks through the end date and skips missing monthly days', () => {
  const weekly = repeatDates('2026-10-09', '2026-10-30', 'weekly');
  assert.equal(weekly.ok, true);
  if (weekly.ok) {
    assert.deepEqual(weekly.dates, ['2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30']);
  }
  const monthly = repeatDates('2026-01-31', '2026-03-31', 'monthly');
  assert.equal(monthly.ok, true);
  if (monthly.ok) {
    assert.deepEqual(monthly.dates, ['2026-01-31', '2026-03-31']);
  }
  const yearly = repeatDates('2028-02-29', '2032-02-29', 'yearly');
  assert.equal(yearly.ok, true);
  if (yearly.ok) {
    assert.deepEqual(yearly.dates, ['2028-02-29', '2032-02-29']);
  }
  assert.equal(repeatDates('2026-10-10', '2026-10-01', 'daily').ok, false);
});

test('keeps old stored tasks when the new fields are missing', () => {
  const [stored] = sanitizeTasks([{ id: '1', date: '2026-10-08', title: 'Купить хлеб', done: false, createdAt: 4 }]);
  assert.equal(stored?.title, 'Купить хлеб');
  assert.equal(stored?.timeEnabled, false);
  assert.equal(stored?.seriesId, null);
  assert.deepEqual(stored?.links, []);
});

test('keeps the saved reminder time when the cycle fields are missing', () => {
  const settings = sanitizeSettings({ enabled: false, hour: 8, minute: 15 });
  assert.equal(settings.enabled, false);
  assert.equal(settings.hour, 8);
  assert.equal(settings.minute, 15);
  assert.equal(settings.cycleEnabled, false);
  assert.equal(settings.cycleStart, null);
  assert.equal(settings.cycleLength, 28);
  assert.equal(settings.appName, 'Yourbook');
  assert.equal(sanitizeSettings({ appName: '  Мой план  ' }).appName, 'Мой план');
  assert.equal(sanitizeSettings({ appName: '   ' }).appName, 'Yourbook');
});

import * as DocumentPicker from 'expo-document-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { BackHandler, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClearableField } from '@/components/ClearableField';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { CycleDateModal } from '@/components/CycleDateModal';
import { ScreenFrame } from '@/components/ScreenFrame';
import { TimeWheel } from '@/components/TimeWheel';
import {
  blankTaskFields,
  dateKey,
  formatCycleDate,
  hasLaterInSeries,
  isDateKey,
  isReminderPast,
  MAX_REPEAT_INTERVAL,
  MAX_TASK_DESCRIPTION,
  MAX_TASK_FILE_BYTES,
  MAX_TASK_FILES,
  MAX_TASK_LINK_LENGTH,
  MAX_TASK_LINKS,
  MAX_TASK_PLACE,
  MAX_TASK_TITLE,
  MIN_REPEAT_INTERVAL,
  repeatDates,
  tasksCountLabel,
  type RepeatKind,
  type TaskFile,
} from '@/lib/plan';
import { type RepeatDraft, type TaskDraft, useTasks } from '@/lib/store';
import { openTaskFile, storeTaskFile } from '@/lib/taskFiles';
import { useKeyboardInset } from '@/lib/useKeyboardInset';
import { theme } from '@/theme';

const REPEAT_OPTIONS: Array<{ kind: RepeatKind; label: string }> = [
  { kind: 'daily', label: 'Каждый день' },
  { kind: 'weekly', label: 'Каждую неделю' },
  { kind: 'monthly', label: 'Каждый месяц' },
  { kind: 'yearly', label: 'Каждый год' },
  { kind: 'interval', label: 'Каждые N дней' },
];

type Prompt = 'leave' | 'series-save' | 'series-save-leave' | 'delete' | 'series-delete' | null;

function draftSignature(draft: TaskDraft, repeatOn: boolean, repeat: RepeatDraft): string {
  return JSON.stringify({ draft, repeatOn, repeat });
}

export default function TaskFormScreen() {
  const params = useLocalSearchParams<{ id?: string; date?: string; draft?: string }>();
  const { ready, tasks, createDetailedTask, saveTaskDetails, deleteTask, deleteFollowingTasks } = useTasks();
  const existing = tasks.find((task) => task.id === params.id);
  const taskDate = existing?.date ?? (typeof params.date === 'string' && isDateKey(params.date) ? params.date : dateKey(new Date()));
  const keyboardHeight = useKeyboardInset();
  const initialDraft = useMemo<TaskDraft>(() => {
    if (existing) {
      return {
        title: existing.title,
        description: existing.description,
        timeEnabled: existing.timeEnabled,
        hour: existing.hour,
        minute: existing.minute,
        reminderEnabled: existing.reminderEnabled,
        reminderDate: existing.reminderDate ?? existing.date,
        reminderHour: existing.reminderHour,
        reminderMinute: existing.reminderMinute,
        place: existing.place,
        links: existing.links,
        files: existing.files,
      };
    }
    return {
      ...blankTaskFields(),
      title: typeof params.draft === 'string' ? params.draft : '',
      reminderDate: taskDate,
    };
  }, [existing, params.draft, taskDate]);
  const [draft, setDraft] = useState<TaskDraft>(initialDraft);
  const [repeatOn, setRepeatOn] = useState(false);
  const [repeat, setRepeat] = useState<RepeatDraft>({ kind: 'weekly', interval: 7, until: taskDate });
  const [linkDraft, setLinkDraft] = useState('');
  const [dateTarget, setDateTarget] = useState<'until' | 'reminder' | null>(null);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [fileNotice, setFileNotice] = useState<string | null>(null);
  const openingSignature = useMemo(() => draftSignature(initialDraft, false, { kind: 'weekly', interval: 7, until: taskDate }), [initialDraft, taskDate]);
  const dirty = draftSignature(draft, repeatOn, repeat) !== openingSignature;
  const linked = existing ? hasLaterInSeries(tasks, existing) : false;
  const repeatResult = repeatOn ? repeatDates(taskDate, repeat.until, repeat.kind, repeat.interval) : null;

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      requestClose();
      return true;
    });
    return () => subscription.remove();
  });

  function patch(next: Partial<TaskDraft>): void {
    setDraft((current) => ({ ...current, ...next }));
    setNotice(null);
  }

  function requestClose(): void {
    if (!existing || !dirty) {
      router.back();
      return;
    }
    setPrompt('leave');
  }

  async function save(scope: 'one' | 'following'): Promise<boolean> {
    if (draft.title.trim().length === 0) {
      setNotice('Нужен заголовок');
      setPrompt(null);
      return false;
    }
    if (existing) {
      await saveTaskDetails(existing.id, draft, scope);
      return true;
    }
    if (repeatOn && repeatResult && !repeatResult.ok) {
      setNotice(repeatResult.reason === 'too-many' ? 'Слишком много задач. Выберите более близкую дату.' : 'Дата окончания раньше дня задачи.');
      return false;
    }
    const result = await createDetailedTask(taskDate, draft, repeatOn ? repeat : null);
    if (result !== 'saved') {
      setNotice(result === 'too-many' ? 'Слишком много задач. Выберите более близкую дату.' : 'Проверьте заголовок и дату окончания.');
      return false;
    }
    return true;
  }

  async function pressSave(): Promise<void> {
    if (existing && linked) {
      setPrompt('series-save');
      return;
    }
    if (await save('one')) {
      router.back();
    }
  }

  function addLink(): void {
    const link = linkDraft.trim();
    if (link.length === 0 || draft.links.length >= MAX_TASK_LINKS) {
      return;
    }
    patch({ links: [...draft.links, link.slice(0, MAX_TASK_LINK_LENGTH)] });
    setLinkDraft('');
  }

  async function pickFile(): Promise<void> {
    if (draft.files.length >= MAX_TASK_FILES) {
      setFileNotice('Можно приложить не больше 5 файлов.');
      return;
    }
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
    if (result.canceled) {
      return;
    }
    const asset = result.assets[0];
    if (asset.size && asset.size > MAX_TASK_FILE_BYTES) {
      setFileNotice('Файл больше 10 МБ.');
      return;
    }
    let uri = asset.uri;
    try {
      uri = await storeTaskFile(asset.uri, asset.name);
    } catch {
      setFileNotice('Не получилось приложить файл.');
      return;
    }
    const file: TaskFile = { id: uri, name: asset.name, uri, mimeType: asset.mimeType ?? null };
    patch({ files: [...draft.files, file] });
    setFileNotice(null);
  }

  async function openPlace(): Promise<void> {
    const place = draft.place.trim();
    if (place.length === 0) {
      return;
    }
    await Linking.openURL(`https://maps.google.com/maps?q=${encodeURIComponent(place)}`);
  }

  async function openLink(link: string): Promise<void> {
    const url = /^https?:\/\//i.test(link) ? link : `https://${link}`;
    await Linking.openURL(url);
  }

  const reminderPast =
    draft.reminderEnabled && draft.reminderDate !== null && isReminderPast(draft.reminderDate, draft.reminderHour, draft.reminderMinute);

  return (
    <ScreenFrame>
      <View style={[styles.flex, { paddingBottom: keyboardHeight }]}>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={requestClose} style={styles.back}>
            <Text style={styles.backText}>‹ Назад</Text>
          </Pressable>
          <Text style={styles.title}>{existing ? 'Задача' : 'Новая задача'}</Text>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ClearableField label="Заголовок" maxLength={MAX_TASK_TITLE} onChange={(title) => patch({ title })} placeholder="Что нужно сделать?" value={draft.title} />
          <ClearableField
            label="Описание"
            maxLength={MAX_TASK_DESCRIPTION}
            multiline
            onChange={(description) => patch({ description })}
            placeholder="Подробности"
            value={draft.description}
          />
          <CheckRow checked={draft.timeEnabled} label="Время" onPress={() => patch({ timeEnabled: !draft.timeEnabled })} />
          {draft.timeEnabled ? (
            <View style={styles.wheels}>
              <TimeWheel label="Часы" length={24} onChange={(hour) => patch({ hour })} value={draft.hour} />
              <TimeWheel label="Минуты" length={60} onChange={(minute) => patch({ minute })} value={draft.minute} />
            </View>
          ) : null}
          <CheckRow
            checked={draft.reminderEnabled}
            label="Напоминание"
            onPress={() => patch({ reminderEnabled: !draft.reminderEnabled, reminderDate: draft.reminderDate ?? taskDate })}
          />
          {draft.reminderEnabled ? (
            <View style={styles.block}>
              <Pressable accessibilityRole="button" onPress={() => setDateTarget('reminder')} style={styles.dateRow}>
                <Text style={styles.fieldLabel}>Дата</Text>
                <Text style={styles.dateValue}>{formatCycleDate(draft.reminderDate ?? taskDate)}</Text>
              </Pressable>
              <View style={styles.wheels}>
                <TimeWheel label="Часы" length={24} onChange={(reminderHour) => patch({ reminderHour })} value={draft.reminderHour} />
                <TimeWheel label="Минуты" length={60} onChange={(reminderMinute) => patch({ reminderMinute })} value={draft.reminderMinute} />
              </View>
              {reminderPast ? <Text style={styles.warning}>Это время уже прошло, напоминание не придёт.</Text> : null}
            </View>
          ) : null}
          {!existing ? (
            <>
              <CheckRow checked={repeatOn} label="Повтор" onPress={() => setRepeatOn((value) => !value)} />
              {repeatOn ? (
                <View style={styles.block}>
                  {REPEAT_OPTIONS.map((option) => (
                    <Pressable key={option.kind} accessibilityRole="button" onPress={() => setRepeat((current) => ({ ...current, kind: option.kind }))} style={styles.option}>
                      <View style={[styles.radio, repeat.kind === option.kind && styles.radioOn]} />
                      <Text style={styles.optionText}>{option.label}</Text>
                    </Pressable>
                  ))}
                  {repeat.kind === 'interval' ? (
                    <View style={styles.stepper}>
                      <Pressable accessibilityLabel="Меньше дней" accessibilityRole="button" onPress={() => setRepeat((current) => ({ ...current, interval: Math.max(MIN_REPEAT_INTERVAL, current.interval - 1) }))} style={styles.step}>
                        <Text style={styles.stepText}>−</Text>
                      </Pressable>
                      <Text style={styles.stepValue}>{repeat.interval} дней</Text>
                      <Pressable accessibilityLabel="Больше дней" accessibilityRole="button" onPress={() => setRepeat((current) => ({ ...current, interval: Math.min(MAX_REPEAT_INTERVAL, current.interval + 1) }))} style={styles.step}>
                        <Text style={styles.stepText}>+</Text>
                      </Pressable>
                    </View>
                  ) : null}
                  <Pressable accessibilityRole="button" onPress={() => setDateTarget('until')} style={styles.dateRow}>
                    <Text style={styles.fieldLabel}>До даты</Text>
                    <Text style={styles.dateValue}>{formatCycleDate(repeat.until)}</Text>
                  </Pressable>
                  {repeatResult?.ok ? <Text style={styles.hint}>Будет создано {tasksCountLabel(repeatResult.dates.length)}</Text> : null}
                  {repeatResult && !repeatResult.ok ? (
                    <Text style={styles.warning}>
                      {repeatResult.reason === 'too-many' ? 'Слишком много задач. Выберите более близкую дату.' : 'Дата окончания раньше дня задачи.'}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </>
          ) : null}
          <ClearableField label="Место" maxLength={MAX_TASK_PLACE} onChange={(place) => patch({ place })} placeholder="Адрес или название" value={draft.place} />
          {draft.place.trim().length > 0 ? (
            <Pressable accessibilityRole="button" onPress={() => void openPlace()} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Открыть в картах</Text>
            </Pressable>
          ) : null}
          <Text style={styles.sectionLabel}>Ссылки</Text>
          {draft.links.map((link, index) => (
            <View key={`${link}-${index}`} style={styles.itemRow}>
              <Pressable accessibilityRole="link" onPress={() => void openLink(link)} style={styles.itemTextButton}>
                <Text numberOfLines={1} style={styles.itemText}>
                  {link}
                </Text>
              </Pressable>
              <Pressable accessibilityLabel="Убрать ссылку" accessibilityRole="button" onPress={() => patch({ links: draft.links.filter((item) => item !== link) })}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
          {draft.links.length < MAX_TASK_LINKS ? (
            <View style={styles.addRow}>
              <View style={styles.addField}>
                <ClearableField label="" maxLength={MAX_TASK_LINK_LENGTH} onChange={setLinkDraft} placeholder="Адрес ссылки" value={linkDraft} />
              </View>
              <Pressable accessibilityLabel="Добавить ссылку" accessibilityRole="button" onPress={addLink} style={styles.smallPlus}>
                <Text style={styles.smallPlusText}>+</Text>
              </Pressable>
            </View>
          ) : null}
          <Text style={styles.sectionLabel}>Файлы</Text>
          {draft.files.map((file) => (
            <View key={file.uri} style={styles.itemRow}>
              <Pressable accessibilityRole="button" onPress={() => void openTaskFile(file)} style={styles.itemTextButton}>
                <Text numberOfLines={1} style={styles.itemText}>
                  {file.name}
                </Text>
              </Pressable>
              <Pressable accessibilityLabel="Убрать файл" accessibilityRole="button" onPress={() => patch({ files: draft.files.filter((item) => item.uri !== file.uri) })}>
                <Text style={styles.remove}>×</Text>
              </Pressable>
            </View>
          ))}
          {draft.files.length < MAX_TASK_FILES ? (
            <Pressable accessibilityRole="button" onPress={() => void pickFile()} style={styles.linkButton}>
              <Text style={styles.linkButtonText}>Приложить файл</Text>
            </Pressable>
          ) : null}
          {fileNotice ? <Text style={styles.warning}>{fileNotice}</Text> : null}
          {notice ? <Text style={styles.warning}>{notice}</Text> : null}
        </ScrollView>
        <View style={styles.footer}>
          {existing ? (
            <Pressable accessibilityRole="button" onPress={() => setPrompt(linked ? 'series-delete' : 'delete')} style={styles.secondary}>
              <Text style={styles.secondaryText}>Удалить</Text>
            </Pressable>
          ) : (
            <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.secondary}>
              <Text style={styles.secondaryText}>Отменить</Text>
            </Pressable>
          )}
          <Pressable accessibilityRole="button" onPress={() => void pressSave()} style={styles.primary}>
            <Text style={styles.primaryText}>{existing ? 'Сохранить' : 'Добавить'}</Text>
          </Pressable>
        </View>
      </View>
      <CycleDateModal
        onClose={() => setDateTarget(null)}
        onSelect={(value) => {
          if (dateTarget === 'until') {
            setRepeat((current) => ({ ...current, until: value }));
          } else {
            patch({ reminderDate: value });
          }
          setDateTarget(null);
        }}
        value={dateTarget === 'until' ? repeat.until : (draft.reminderDate ?? taskDate)}
        visible={dateTarget !== null}
      />
      <ConfirmDialog
        choices={
          prompt === 'leave'
            ? [
                { label: 'Нет', onPress: () => router.back() },
                {
                  label: 'Да',
                  tone: 'primary',
                  onPress: () => {
                    if (linked) {
                      setPrompt('series-save-leave');
                      return;
                    }
                    void save('one').then((ok) => {
                      if (ok) router.back();
                    });
                  },
                },
              ]
            : prompt === 'series-save' || prompt === 'series-save-leave'
              ? [
                  { label: 'Нет', onPress: () => setPrompt(null) },
                  {
                    label: 'Только эту',
                    onPress: () => {
                      void save('one').then((ok) => {
                        if (ok) router.back();
                      });
                    },
                  },
                  {
                    label: 'Все последующие',
                    tone: 'primary',
                    onPress: () => {
                      void save('following').then((ok) => {
                        if (ok) router.back();
                      });
                    },
                  },
                ]
              : prompt === 'series-delete'
                ? [
                    { label: 'Нет', onPress: () => setPrompt(null) },
                    {
                      label: 'Только эту',
                      onPress: () => {
                        if (!existing) return;
                        void deleteTask(existing.id).then(() => router.back());
                      },
                    },
                    {
                      label: 'Все последующие',
                      tone: 'danger',
                      onPress: () => {
                        if (!existing) return;
                        void deleteFollowingTasks(existing.id).then(() => router.back());
                      },
                    },
                  ]
                : [
                    { label: 'Нет', onPress: () => setPrompt(null) },
                    {
                      label: 'Да',
                      tone: 'danger',
                      onPress: () => {
                        if (!existing) return;
                        void deleteTask(existing.id).then(() => router.back());
                      },
                    },
                  ]
        }
        onClose={() => setPrompt(null)}
        title={
          prompt === 'leave'
            ? 'Сохранить изменения?'
            : prompt === 'series-save' || prompt === 'series-save-leave'
              ? 'Сохранить для всех задач?'
              : prompt === 'series-delete'
                ? 'Удалить все связанные задачи?'
                : 'Удалить задачу?'
        }
        visible={prompt !== null && ready}
      />
    </ScreenFrame>
  );
}

function CheckRow({ checked, label, onPress }: { checked: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onPress} style={styles.checkRow}>
      <View style={[styles.box, checked && styles.boxOn]}>{checked ? <Text style={styles.check}>✓</Text> : null}</View>
      <Text style={styles.checkLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8 },
  back: { alignSelf: 'flex-start', paddingVertical: 4 },
  backText: { color: theme.accentDark, fontSize: 16, fontWeight: '700' },
  title: { color: theme.ink, fontSize: 32, fontWeight: '700', marginTop: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
  wheels: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginBottom: 12 },
  block: { marginBottom: 12 },
  dateRow: { paddingVertical: 8, gap: 2 },
  fieldLabel: { color: theme.muted, fontSize: 13, fontWeight: '600' },
  dateValue: { color: theme.ink, fontSize: 18, fontWeight: '700' },
  warning: { color: theme.danger, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  hint: { color: theme.muted, fontSize: 14, marginTop: 4 },
  sectionLabel: { color: theme.muted, fontSize: 13, fontWeight: '700', marginBottom: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  itemTextButton: { flex: 1 },
  itemText: { color: theme.accentDark, fontSize: 16 },
  remove: { color: '#C4B6AA', fontSize: 22, paddingHorizontal: 6 },
  addRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  addField: { flex: 1 },
  smallPlus: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.accent, alignItems: 'center', justifyContent: 'center' },
  smallPlusText: { color: theme.white, fontSize: 24, lineHeight: 26 },
  linkButton: { alignSelf: 'flex-start', marginBottom: 14 },
  linkButtonText: { color: theme.accentDark, fontWeight: '700' },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: theme.line },
  radioOn: { borderColor: theme.accent, backgroundColor: theme.accent },
  optionText: { color: theme.ink, fontSize: 16 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 8 },
  step: { width: 40, height: 40, borderRadius: 12, backgroundColor: theme.accentSoft, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: theme.accentDark, fontSize: 24, fontWeight: '700' },
  stepValue: { color: theme.ink, fontSize: 16, fontWeight: '700' },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  box: { width: 26, height: 26, borderRadius: 8, borderWidth: 1.5, borderColor: theme.line, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.white },
  boxOn: { backgroundColor: theme.accent, borderColor: theme.accent },
  check: { color: theme.white, fontSize: 16, fontWeight: '700' },
  checkLabel: { color: theme.ink, fontSize: 16, fontWeight: '600', flex: 1 },
  footer: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.line },
  secondary: { flex: 1, borderRadius: 16, borderWidth: 1, borderColor: theme.line, paddingVertical: 14, alignItems: 'center', backgroundColor: theme.card },
  secondaryText: { color: theme.ink, fontWeight: '700' },
  primary: { flex: 1, borderRadius: 16, backgroundColor: theme.accent, paddingVertical: 14, alignItems: 'center' },
  primaryText: { color: theme.white, fontWeight: '700' },
});

import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ClearableField } from '@/components/ClearableField';
import { CycleDateModal } from '@/components/CycleDateModal';
import { ScreenFrame } from '@/components/ScreenFrame';
import { TimeWheel } from '@/components/TimeWheel';
import { cycleLengthLabel, dateKey, DEFAULT_SETTINGS, formatCycleDate, MAX_APP_NAME, MAX_CYCLE_LENGTH, MIN_CYCLE_LENGTH } from '@/lib/plan';
import { useTasks } from '@/lib/store';
import { theme } from '@/theme';

export default function SettingsScreen() {
  const { ready, settings, permission, reminderError, updateSettings } = useTasks();
  const [dateOpen, setDateOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(settings.appName);
  const nameHydrated = useRef(false);
  const cycleDate = settings.cycleStart ?? dateKey(new Date());

  useEffect(() => {
    if (ready && !nameHydrated.current) {
      nameHydrated.current = true;
      setNameDraft(settings.appName);
    }
  }, [ready, settings.appName]);

  function commitName(value: string): void {
    const trimmed = value.trim().slice(0, MAX_APP_NAME);
    const appName = trimmed.length > 0 ? trimmed : DEFAULT_SETTINGS.appName;
    setNameDraft(appName);
    if (ready && appName !== settings.appName) {
      void updateSettings({ ...settings, appName });
    }
  }

  function leave(): void {
    commitName(nameDraft);
    router.back();
  }

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      commitName(nameDraft);
      router.back();
      return true;
    });
    return () => subscription.remove();
  }, [nameDraft, ready, settings, updateSettings]);

  return (
    <ScreenFrame>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable accessibilityRole="button" onPress={leave} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>‹ Назад</Text>
        </Pressable>
        <Text style={styles.title}>Настройки</Text>
        <Text style={styles.section}>Название</Text>
        <ClearableField
          editable={ready}
          label=""
          maxLength={MAX_APP_NAME}
          onBlur={() => commitName(nameDraft)}
          onChange={setNameDraft}
          placeholder="Yourbook"
          value={nameDraft}
        />
        <Text style={styles.section}>Уведомление</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: settings.enabled }}
            disabled={!ready}
            onPress={() => {
              void updateSettings({ ...settings, enabled: !settings.enabled });
            }}
            style={styles.checkRow}
          >
            <View style={[styles.box, settings.enabled && styles.boxOn]}>
              {settings.enabled ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>Активация напоминаний</Text>
          </Pressable>
          {settings.enabled ? (
            <View style={styles.wheels}>
              <TimeWheel
                label="Часы"
                length={24}
                onChange={(hour) => {
                  if (ready) {
                    void updateSettings({ ...settings, hour });
                  }
                }}
                value={settings.hour}
              />
              <TimeWheel
                label="Минуты"
                length={60}
                onChange={(minute) => {
                  if (ready) {
                    void updateSettings({ ...settings, minute });
                  }
                }}
                value={settings.minute}
              />
            </View>
          ) : null}
          {permission === 'denied' ? (
            <Text style={styles.warning}>Уведомления выключены в настройках телефона.</Text>
          ) : null}
          {reminderError ? <Text style={styles.warning}>{reminderError}</Text> : null}
        </View>

        <Text style={styles.section}>Месячные</Text>
        <View style={styles.card}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: settings.cycleEnabled }}
            disabled={!ready}
            onPress={() => {
              const next = !settings.cycleEnabled;
              void updateSettings({
                ...settings,
                cycleEnabled: next,
                cycleStart: settings.cycleStart ?? dateKey(new Date()),
              });
            }}
            style={styles.checkRow}
          >
            <View style={[styles.box, settings.cycleEnabled && styles.boxOn]}>
              {settings.cycleEnabled ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <Text style={styles.checkLabel}>Показывать первый день</Text>
          </Pressable>
          {settings.cycleEnabled ? (
            <>
              <Pressable accessibilityRole="button" onPress={() => setDateOpen(true)} style={styles.dateRow}>
                <Text style={styles.fieldLabel}>Первый день</Text>
                <Text style={styles.dateValue}>{formatCycleDate(cycleDate)}</Text>
              </Pressable>
              <View style={styles.stepper}>
                <Text style={styles.fieldLabel}>Регулярность</Text>
                <View style={styles.stepControls}>
                  <Pressable
                    accessibilityLabel="Меньше дней"
                    accessibilityRole="button"
                    disabled={settings.cycleLength <= MIN_CYCLE_LENGTH}
                    onPress={() => {
                      void updateSettings({ ...settings, cycleLength: settings.cycleLength - 1 });
                    }}
                    style={({ pressed }) => [
                      styles.stepButton,
                      settings.cycleLength <= MIN_CYCLE_LENGTH && styles.stepDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.stepText}>−</Text>
                  </Pressable>
                  <Text style={styles.stepValue}>{cycleLengthLabel(settings.cycleLength)}</Text>
                  <Pressable
                    accessibilityLabel="Больше дней"
                    accessibilityRole="button"
                    disabled={settings.cycleLength >= MAX_CYCLE_LENGTH}
                    onPress={() => {
                      void updateSettings({ ...settings, cycleLength: settings.cycleLength + 1 });
                    }}
                    style={({ pressed }) => [
                      styles.stepButton,
                      settings.cycleLength >= MAX_CYCLE_LENGTH && styles.stepDisabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Text style={styles.stepText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>
      <CycleDateModal
        onClose={() => setDateOpen(false)}
        onSelect={(cycleStart) => {
          void updateSettings({ ...settings, cycleStart });
          setDateOpen(false);
        }}
        value={cycleDate}
        visible={dateOpen}
      />
    </ScreenFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  back: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    marginBottom: 8,
  },
  backText: {
    color: theme.accentDark,
    fontSize: 16,
    fontWeight: '700',
  },
  title: {
    color: theme.ink,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: -0.8,
  },
  section: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 18,
    marginBottom: 8,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 22,
    padding: 16,
  },
  wheels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 28,
    marginTop: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  box: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.white,
  },
  boxOn: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  check: {
    color: theme.white,
    fontSize: 16,
    fontWeight: '700',
  },
  checkLabel: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  dateRow: {
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.line,
    gap: 4,
  },
  fieldLabel: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  dateValue: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  stepper: {
    marginTop: 16,
    gap: 8,
  },
  stepControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: theme.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDisabled: {
    opacity: 0.35,
  },
  stepText: {
    color: theme.accentDark,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  stepValue: {
    flex: 1,
    color: theme.ink,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  warning: {
    color: theme.danger,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 12,
  },
  pressed: {
    opacity: 0.55,
  },
});

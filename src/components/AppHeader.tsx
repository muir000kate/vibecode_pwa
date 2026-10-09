import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTasks } from '@/lib/store';
import { theme } from '@/theme';

type AppHeaderProps = {
  subtitle?: string;
  detail?: string;
  back?: boolean;
};

export function AppHeader({ subtitle, detail, back = false }: AppHeaderProps) {
  const { settings } = useTasks();

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        {back ? (
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={({ pressed }) => [styles.back, pressed && styles.backPressed]}>
            <Text style={styles.backText}>‹ Назад</Text>
          </Pressable>
        ) : (
          <Text numberOfLines={1} style={styles.brand}>{settings.appName}</Text>
        )}
        <Pressable
          accessibilityLabel="Настройки"
          accessibilityRole="button"
          onPress={() => router.push('/settings')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.settingsPressed]}
        >
          <Ionicons color={theme.ink} name="settings-outline" size={22} />
        </Pressable>
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {detail ? <Text style={styles.detail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 4,
  },
  back: {
    paddingVertical: 8,
    paddingRight: 12,
  },
  backText: {
    color: theme.accentDark,
    fontSize: 16,
    fontWeight: '700',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  brand: {
    flexShrink: 1,
    color: theme.ink,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  settingsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.55,
  },
  settingsPressed: {
    backgroundColor: theme.accentSoft,
  },
  subtitle: {
    color: theme.ink,
    fontSize: 18,
    fontWeight: '700',
  },
  detail: {
    color: theme.muted,
    fontSize: 15,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { theme } from '@/theme';

type TaskComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onDetails: () => void;
};

export function TaskComposer({ value, onChange, onSubmit, onDetails }: TaskComposerProps) {
  const canSave = value.trim().length > 0;

  return (
    <View style={styles.composer}>
      <View style={styles.row}>
        <View style={styles.inputWrap}>
          <TextInput
            accessibilityLabel="Новая задача"
            maxLength={200}
            onChangeText={onChange}
            onSubmitEditing={() => {
              if (canSave) {
                onSubmit();
              }
            }}
            placeholder="Что нужно сделать?"
            placeholderTextColor={theme.muted}
            returnKeyType="done"
            style={styles.input}
            value={value}
          />
          {value.length > 0 ? (
            <Pressable accessibilityLabel="Стереть" accessibilityRole="button" onPress={() => onChange('')} style={styles.clear}>
              <Text style={styles.clearText}>×</Text>
            </Pressable>
          ) : null}
        </View>
        <Pressable accessibilityLabel="Подробная задача" accessibilityRole="button" onPress={onDetails} style={({ pressed }) => [styles.circle, styles.gear, pressed && styles.pressed]}>
          <Ionicons color={theme.ink} name="settings-outline" size={20} />
        </Pressable>
        <Pressable
          accessibilityLabel="Добавить"
          accessibilityRole="button"
          disabled={!canSave}
          onPress={onSubmit}
          style={({ pressed }) => [styles.circle, styles.plus, !canSave && styles.disabled, pressed && canSave && styles.pressed]}
        >
          <Text style={styles.plusText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  composer: {
    borderTopWidth: 1,
    borderTopColor: theme.line,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: theme.bg,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  inputWrap: {
    flex: 1,
    position: 'relative',
  },
  input: {
    backgroundColor: theme.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.line,
    paddingLeft: 14,
    paddingRight: 36,
    paddingVertical: 12,
    color: theme.ink,
    fontSize: 16,
  },
  clear: {
    position: 'absolute',
    right: 4,
    top: 0,
    bottom: 0,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    color: '#C4B6AA',
    fontSize: 22,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
  circle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gear: {
    backgroundColor: theme.card,
    borderWidth: 1,
    borderColor: theme.line,
  },
  plus: {
    backgroundColor: theme.accent,
  },
  plusText: {
    color: theme.white,
    fontSize: 28,
    lineHeight: 30,
    fontWeight: '500',
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.75,
  },
});

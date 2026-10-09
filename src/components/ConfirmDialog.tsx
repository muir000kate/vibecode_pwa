import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

type Choice = {
  label: string;
  tone?: 'quiet' | 'primary' | 'danger';
  onPress: () => void;
};

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  body?: string;
  choices: Choice[];
  onClose: () => void;
};

export function ConfirmDialog({ visible, title, body, choices, onClose }: ConfirmDialogProps) {
  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          {body ? <Text style={styles.body}>{body}</Text> : null}
          <View style={styles.actions}>
            {choices.map((choice) => (
              <Pressable
                key={choice.label}
                accessibilityRole="button"
                onPress={choice.onPress}
                style={({ pressed }) => [
                  styles.button,
                  choice.tone === 'danger' && styles.danger,
                  choice.tone === 'primary' && styles.primary,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.buttonText, (choice.tone === 'danger' || choice.tone === 'primary') && styles.lightText]}>
                  {choice.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(36, 28, 22, 0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 24,
    padding: 20,
    gap: 12,
  },
  title: {
    color: theme.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  body: {
    color: theme.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    gap: 8,
    marginTop: 4,
  },
  button: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.line,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  danger: {
    backgroundColor: theme.danger,
    borderColor: theme.danger,
  },
  buttonText: {
    color: theme.ink,
    fontWeight: '700',
  },
  lightText: {
    color: theme.white,
  },
  pressed: {
    opacity: 0.75,
  },
});

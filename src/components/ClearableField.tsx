import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { theme } from '@/theme';

type ClearableFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
} & Pick<TextInputProps, 'keyboardType' | 'autoCapitalize' | 'onBlur' | 'editable'>;

export function ClearableField({ label, value, onChange, placeholder, multiline = false, maxLength, keyboardType, autoCapitalize, onBlur, editable }: ClearableFieldProps) {
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={styles.wrap}>
        <TextInput
          autoCapitalize={autoCapitalize}
          editable={editable}
          keyboardType={keyboardType}
          maxLength={maxLength}
          onBlur={onBlur}
          multiline={multiline}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={theme.muted}
          style={[styles.input, multiline && styles.multiline]}
          value={value}
        />
        {value.length > 0 ? (
          <Pressable accessibilityLabel="Стереть" accessibilityRole="button" onPress={() => onChange('')} style={[styles.clear, multiline ? styles.clearFirstLine : styles.clearMiddle]}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: theme.muted,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  wrap: {
    position: 'relative',
    marginBottom: 14,
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
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  clear: {
    position: 'absolute',
    right: 4,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearMiddle: {
    top: 0,
    bottom: 0,
  },
  clearFirstLine: {
    top: 0,
    height: 48,
  },
  clearText: {
    color: '#C4B6AA',
    fontSize: 22,
    lineHeight: 22,
    textAlign: 'center',
    includeFontPadding: false,
  },
});

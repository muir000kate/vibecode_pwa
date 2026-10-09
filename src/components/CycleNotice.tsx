import { StyleSheet, Text, View } from 'react-native';

import { DropMark } from '@/components/DropMark';

export function CycleNotice() {
  return (
    <View accessibilityRole="text" style={styles.row}>
      <DropMark size={14} />
      <Text style={styles.title}>Первый день</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8D7E0',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  title: {
    color: '#8E3048',
    fontSize: 16,
    fontWeight: '700',
  },
});

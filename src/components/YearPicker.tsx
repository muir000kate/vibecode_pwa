import { useEffect, useRef } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

const ITEM_HEIGHT = 48;
const START_YEAR = 2020;
const END_YEAR = 2100;
const YEARS = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, index) => START_YEAR + index);

type YearPickerProps = {
  visible: boolean;
  year: number;
  onClose: () => void;
  onSelect: (year: number) => void;
};

export function YearPicker({ visible, year, onClose, onSelect }: YearPickerProps) {
  const listRef = useRef<FlatList<number>>(null);

  useEffect(() => {
    if (!visible) {
      return;
    }
    const index = Math.max(0, YEARS.indexOf(year));
    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({ index, animated: false, viewPosition: 0.5 });
    }, 50);
    return () => clearTimeout(timer);
  }, [visible, year]);

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.card}>
          <Text style={styles.title}>Год</Text>
          <FlatList
            ref={listRef}
            data={YEARS}
            keyExtractor={(item) => String(item)}
            getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
            initialScrollIndex={Math.max(0, YEARS.indexOf(year))}
            onScrollToIndexFailed={(info) => {
              listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
            }}
            showsVerticalScrollIndicator
            style={styles.list}
            renderItem={({ item }) => {
              const active = item === year;
              return (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => onSelect(item)}
                  style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
                >
                  <Text style={[styles.year, active && styles.yearActive]}>{item}</Text>
                </Pressable>
              );
            }}
          />
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
    padding: 28,
  },
  backdropPress: {
    ...StyleSheet.absoluteFill,
  },
  card: {
    backgroundColor: theme.bg,
    borderRadius: 24,
    paddingVertical: 16,
    maxHeight: 420,
  },
  title: {
    color: theme.ink,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  list: {
    height: 340,
  },
  row: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActive: {
    backgroundColor: theme.accentSoft,
  },
  year: {
    color: theme.muted,
    fontSize: 18,
  },
  yearActive: {
    color: theme.accentDark,
    fontSize: 22,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.7,
  },
});

import { useEffect, useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { theme } from '@/theme';

const ITEM_HEIGHT = 44;

type TimeWheelProps = {
  label: string;
  length: number;
  value: number;
  onChange: (value: number) => void;
};

export function TimeWheel({ label, length, value, onChange }: TimeWheelProps) {
  const listRef = useRef<ScrollView>(null);
  const values = useMemo(() => Array.from({ length }, (_, index) => index), [length]);

  useEffect(() => {
    listRef.current?.scrollTo({ y: value * ITEM_HEIGHT, animated: false });
  }, [value]);

  return (
    <View style={styles.column}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.window}>
        <View pointerEvents="none" style={styles.highlight} />
        <ScrollView
          ref={listRef}
          contentContainerStyle={styles.padding}
          decelerationRate="fast"
          nestedScrollEnabled
          onMomentumScrollEnd={(event) => {
            const next = Math.min(length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.y / ITEM_HEIGHT)));
            if (next !== value) {
              onChange(next);
            }
          }}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
        >
          {values.map((item) => (
            <View key={item} style={styles.item}>
              <Text style={[styles.number, item === value && styles.numberActive]}>{String(item).padStart(2, '0')}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  column: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  label: {
    color: theme.muted,
    fontSize: 14,
  },
  window: {
    height: ITEM_HEIGHT * 3,
    width: '100%',
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: ITEM_HEIGHT,
    left: 12,
    right: 12,
    height: ITEM_HEIGHT,
    borderRadius: 12,
    backgroundColor: theme.accentSoft,
  },
  padding: {
    paddingVertical: ITEM_HEIGHT,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  number: {
    color: theme.muted,
    fontSize: 18,
  },
  numberActive: {
    color: theme.ink,
    fontSize: 28,
    fontWeight: '700',
  },
});

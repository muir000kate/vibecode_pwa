import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { dateKey, formatCycleDate, MONTHS_NOMINATIVE, parseDateKey } from '@/lib/plan';
import { theme } from '@/theme';

const START_YEAR = 2020;
const END_YEAR = 2100;
const WEEKDAYS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

type CycleDateModalProps = {
  visible: boolean;
  value: string;
  onClose: () => void;
  onSelect: (date: string) => void;
};

function weeksFor(year: number, month: number): Array<Array<number | null>> {
  const cells = cellsFor(year, month);
  const weeks: Array<Array<number | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    const week = cells.slice(index, index + 7);
    while (week.length < 7) {
      week.push(null);
    }
    weeks.push(week);
  }
  return weeks;
}

function cellsFor(year: number, month: number): Array<number | null> {
  const first = new Date(year, month, 1);
  const leading = (first.getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= count; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

export function CycleDateModal({ visible, value, onClose, onSelect }: CycleDateModalProps) {
  const initial = parseDateKey(value);
  const [year, setYear] = useState(initial.getFullYear());
  const [month, setMonth] = useState(initial.getMonth());

  function shift(delta: number): void {
    const next = new Date(year, month + delta, 1);
    if (next.getFullYear() < START_YEAR || next.getFullYear() > END_YEAR) {
      return;
    }
    setYear(next.getFullYear());
    setMonth(next.getMonth());
  }

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose} onShow={() => {
      const date = parseDateKey(value);
      setYear(date.getFullYear());
      setMonth(date.getMonth());
    }}>
      <View style={styles.backdrop}>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.backdropPress} />
        <View style={styles.card}>
          <Text style={styles.title}>Первый день</Text>
          <View style={styles.titleRow}>
            <Pressable accessibilityLabel="Предыдущий месяц" accessibilityRole="button" onPress={() => shift(-1)} style={styles.arrow}>
              <Text style={styles.arrowText}>‹</Text>
            </Pressable>
            <Text style={styles.month}>
              {MONTHS_NOMINATIVE[month]} {year}
            </Text>
            <Pressable accessibilityLabel="Следующий месяц" accessibilityRole="button" onPress={() => shift(1)} style={styles.arrow}>
              <Text style={styles.arrowText}>›</Text>
            </Pressable>
          </View>
          <View style={styles.week}>
            {WEEKDAYS.map((label) => (
              <Text key={label} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>
          {weeksFor(year, month).map((week, weekIndex) => (
            <View key={weekIndex} style={styles.weekRow}>
              {week.map((day, dayIndex) => {
                if (!day) {
                  return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.day} />;
                }
                const key = dateKey(new Date(year, month, day));
                const selected = key === value;
                return (
                  <Pressable
                    key={key}
                    accessibilityLabel={formatCycleDate(key)}
                    accessibilityRole="button"
                    onPress={() => onSelect(key)}
                    style={({ pressed }) => [styles.day, selected && styles.daySelected, pressed && styles.pressed]}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{day}</Text>
                  </Pressable>
                );
              })}
            </View>
          ))}
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
    padding: 16,
  },
  title: {
    color: theme.ink,
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  month: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  arrow: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: {
    color: theme.muted,
    fontSize: 28,
    lineHeight: 30,
  },
  week: {
    flexDirection: 'row',
    marginTop: 8,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: theme.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    paddingBottom: 4,
  },
  weekRow: {
    flexDirection: 'row',
  },
  day: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: '#F8D7E0',
    borderRadius: 12,
  },
  dayText: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '600',
  },
  dayTextSelected: {
    color: '#8E3048',
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.6,
  },
});

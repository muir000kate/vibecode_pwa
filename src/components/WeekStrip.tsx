import { useEffect, useMemo, useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { DropMark } from '@/components/DropMark';
import { addDays, dateKey, parseDateKey, weekdayShort, type DayDot } from '@/lib/plan';
import { theme } from '@/theme';

const PAST_DAYS = 30;
const FUTURE_DAYS = 120;
const DAY_STRIDE = 60;

type WeekStripProps = {
  selected: string;
  today: string;
  dots: ReadonlyMap<string, DayDot>;
  drops: ReadonlySet<string>;
  onSelect: (date: string) => void;
};

export function WeekStrip({ selected, today, dots, drops, onSelect }: WeekStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const start = useMemo(() => addDays(parseDateKey(today), -PAST_DAYS), [today]);
  const days = useMemo(
    () => Array.from({ length: PAST_DAYS + FUTURE_DAYS + 1 }, (_, index) => addDays(start, index)),
    [start],
  );

  useEffect(() => {
    const index = days.findIndex((day) => dateKey(day) === selected);
    if (index < 0) {
      return;
    }
    scrollRef.current?.scrollTo({
      x: Math.max(0, index * DAY_STRIDE - width / 2 + DAY_STRIDE / 2),
      animated: true,
    });
  }, [days, selected, width]);

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      contentContainerStyle={styles.content}
      showsHorizontalScrollIndicator={false}
      style={styles.strip}
    >
      {days.map((day) => {
        const key = dateKey(day);
        const active = key === selected;
        const isToday = key === today;
        return (
          <Pressable
            key={key}
            accessibilityLabel={key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(key)}
            style={[styles.day, active && styles.dayActive, isToday && !active && styles.dayToday]}
          >
            <Text style={[styles.weekday, active && styles.onAccent]}>{weekdayShort(day)}</Text>
            <Text style={[styles.number, active && styles.onAccent]}>{day.getDate()}</Text>
            <View style={styles.marks}>
              {drops.has(key) ? <DropMark size={8} /> : null}
              {dots.has(key) ? (
                <View
                  style={[
                    styles.dot,
                    dots.get(key) === 'open' && (active ? styles.dotOnAccent : styles.dotOn),
                    dots.get(key) === 'done' && (active ? styles.dotDoneAccent : styles.dotDone),
                  ]}
                />
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexGrow: 0,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    alignItems: 'center',
  },
  day: {
    width: 52,
    height: 58,
    marginRight: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    gap: 1,
  },
  dayActive: {
    backgroundColor: theme.accent,
  },
  dayToday: {
    backgroundColor: theme.accentSoft,
  },
  weekday: {
    color: theme.muted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  number: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '700',
  },
  onAccent: {
    color: theme.white,
  },
  marks: {
    height: 10,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dotOn: {
    backgroundColor: theme.accent,
  },
  dotOnAccent: {
    backgroundColor: theme.white,
  },
  dotDone: {
    backgroundColor: '#A8988C',
  },
  dotDoneAccent: {
    backgroundColor: '#E7DED4',
  },
});

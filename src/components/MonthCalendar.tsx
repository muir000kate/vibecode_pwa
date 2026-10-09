import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DropMark } from '@/components/DropMark';
import { YearPicker } from '@/components/YearPicker';
import { dateKey, MONTHS_NOMINATIVE, type DayDot } from '@/lib/plan';
import { theme } from '@/theme';

const START_YEAR = 2020;
const END_YEAR = 2100;

type MonthCalendarProps = {
  year: number;
  month: number;
  dots: ReadonlyMap<string, DayDot>;
  drops: ReadonlySet<string>;
  onChange: (year: number, month: number) => void;
  onSelectDay: (date: string) => void;
};

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
  while (cells.length < 42) {
    cells.push(null);
  }
  return cells;
}

export function MonthCalendar({ year, month, dots, drops, onChange, onSelectDay }: MonthCalendarProps) {
  const [yearOpen, setYearOpen] = useState(false);
  const today = dateKey(new Date());
  const weekdayLabels = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];

  function shift(delta: number): void {
    const next = new Date(year, month + delta, 1);
    const nextYear = next.getFullYear();
    if (nextYear < START_YEAR || nextYear > END_YEAR) {
      return;
    }
    onChange(nextYear, next.getMonth());
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Pressable accessibilityLabel="Предыдущий месяц" accessibilityRole="button" onPress={() => shift(-1)} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
        <View style={styles.titleText}>
          <Text style={styles.title}>{MONTHS_NOMINATIVE[month]},</Text>
          <Pressable accessibilityRole="button" onPress={() => setYearOpen(true)} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.year}>{year}</Text>
          </Pressable>
        </View>
        <Pressable accessibilityLabel="Следующий месяц" accessibilityRole="button" onPress={() => shift(1)} style={({ pressed }) => [styles.arrow, pressed && styles.pressed]}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      </View>
      <View style={styles.weekdays}>
        {weekdayLabels.map((label) => (
          <Text key={label} style={styles.weekday}>
            {label}
          </Text>
        ))}
      </View>
      <MonthPage dots={dots} drops={drops} month={month} onSelectDay={onSelectDay} today={today} year={year} />
      <YearPicker
        onClose={() => setYearOpen(false)}
        onSelect={(nextYear) => {
          setYearOpen(false);
          onChange(nextYear, month);
        }}
        visible={yearOpen}
        year={year}
      />
    </View>
  );
}

function MonthPage({
  year,
  month,
  today,
  dots,
  drops,
  onSelectDay,
}: {
  year: number;
  month: number;
  today: string;
  dots: ReadonlyMap<string, DayDot>;
  drops: ReadonlySet<string>;
  onSelectDay: (date: string) => void;
}) {
  const cells = cellsFor(year, month);
  const weeks: Array<Array<number | null>> = [];
  for (let index = 0; index < cells.length; index += 7) {
    weeks.push(cells.slice(index, index + 7));
  }
  return (
    <View style={styles.page}>
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.week}>
          {week.map((day, dayIndex) => {
            if (!day) {
              return <View key={`empty-${weekIndex}-${dayIndex}`} style={styles.day} />;
            }
            const key = dateKey(new Date(year, month, day));
            const isToday = key === today;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                onPress={() => onSelectDay(key)}
                style={({ pressed }) => [styles.day, isToday && styles.today, pressed && styles.pressed]}
              >
                <Text style={[styles.dayNumber, isToday && styles.todayNumber]}>{day}</Text>
                <View style={styles.dotSlot}>
                  {drops.has(key) ? <DropMark size={8} /> : null}
                  {dots.has(key) ? (
                    <View style={[styles.dot, dots.get(key) === 'open' ? styles.dotOn : styles.dotDone]} />
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  titleText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    color: theme.ink,
    fontSize: 20,
    fontWeight: '700',
  },
  year: {
    color: theme.accent,
    fontSize: 20,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.55,
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
  weekdays: {
    flexDirection: 'row',
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: theme.muted,
    fontSize: 12,
    textTransform: 'uppercase',
    paddingBottom: 2,
    includeFontPadding: false,
  },
  page: {
    overflow: 'hidden',
  },
  week: {
    flexDirection: 'row',
    width: '100%',
  },
  day: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  today: {
    backgroundColor: theme.accentSoft,
    borderRadius: 14,
  },
  dayNumber: {
    color: theme.ink,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  todayNumber: {
    color: theme.accentDark,
    fontWeight: '700',
  },
  dotSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 2,
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
  dotDone: {
    backgroundColor: '#A8988C',
  },
});

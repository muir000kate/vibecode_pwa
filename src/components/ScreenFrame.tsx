import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { theme } from '@/theme';

export function ScreenFrame({ children }: { children: ReactNode }) {
  return (
    <View style={styles.backdrop}>
      <SafeAreaView style={styles.phone}>{children}</SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: theme.bg,
    alignItems: 'center',
  },
  phone: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
  },
});

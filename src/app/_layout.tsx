import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { TasksProvider } from '@/lib/store';
import { theme } from '@/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <TasksProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.bg },
          }}
        />
      </TasksProvider>
    </SafeAreaProvider>
  );
}

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppProvider } from '@/context/AppContext';
import { setupNotificationHandler } from '@/utils/notifications';

setupNotificationHandler();

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0A0A0F' } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="log-ride"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="log-ride-manual"
          options={{
            presentation: 'modal',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="settings"
          options={{ presentation: 'card', headerShown: false }}
        />
        <Stack.Screen
          name="auth"
          options={{ presentation: 'card', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ presentation: 'card', headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="dev-tools"
          options={{ presentation: 'card', headerShown: false }}
        />
      </Stack>
    </AppProvider>
  );
}

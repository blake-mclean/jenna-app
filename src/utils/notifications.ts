import * as Notifications from 'expo-notifications';
import { NotificationSettings } from '../types';

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleDaily(settings: NotificationSettings): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;

  const PROMPTS = [
    { title: 'Time to ride! 🚴', body: 'Have you logged your spin session today?' },
    { title: 'Spin check-in 🔥', body: 'How was your ride today? Tap to log it.' },
    { title: 'Keep the momentum going!', body: 'Log today\'s ride and keep your streak alive.' },
    { title: 'Your bike is calling 📣', body: 'Don\'t forget to log your workout!' },
  ];
  const pick = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];

  await Notifications.scheduleNotificationAsync({
    content: { title: pick.title, body: pick.body, sound: true },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.dailyReminderHour,
      minute: settings.dailyReminderMinute,
    } as Notifications.DailyTriggerInput,
  });
}

export async function sendStreakCelebration(streak: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🔥 ${streak}-day streak!`,
      body: `You're on fire! ${streak} days in a row — keep it going!`,
      sound: true,
    },
    trigger: null,
  });
}

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

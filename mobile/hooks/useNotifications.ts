import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import i18n from '../lib/i18n';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function scheduleStreakRiskNotification(
  expiresAt: string,
  friendName?: string,
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const expiryDate = new Date(expiresAt);
    const warningDate = new Date(expiryDate.getTime() - 4 * 60 * 60 * 1000);
    if (warningDate <= new Date()) return null;

    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.streakRiskTitle'),
        body: i18n.t('notifications.streakRiskBody', {
          name: friendName ?? i18n.t('notifications.friendFallback'),
        }),
        data: { type: 'streak_risk' },
      },
      trigger: {
        date: warningDate,
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
    return id;
  } catch {
    return null;
  }
}

export async function cancelStreakRiskNotification(notificationId: string | null): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch {
    // ignore
  }
}

export async function sendExpoPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>,
): Promise<void> {
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to: pushToken, title, body, data }),
    });
  } catch {
    // Push notification failure must never crash the app
  }
}

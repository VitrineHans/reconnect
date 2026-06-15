// Phase 4 follow-up — notification on/off preference (persisted + respected).

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('notif-1'),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));
jest.mock('../lib/supabase', () => ({ supabase: {} }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNotificationsEnabled, setNotificationsEnabled, NOTIFICATIONS_KEY } from '../lib/notificationPrefs';
import { scheduleStreakRiskNotification } from '../hooks/useNotifications';

const laterExpiry = () => new Date(Date.now() + 10 * 60 * 60 * 1000).toISOString();

describe('notification preferences', () => {
  afterEach(async () => { await AsyncStorage.removeItem(NOTIFICATIONS_KEY); });

  it('defaults to enabled', async () => {
    expect(await getNotificationsEnabled()).toBe(true);
  });

  it('persists disabled, then re-enabled', async () => {
    await setNotificationsEnabled(false);
    expect(await getNotificationsEnabled()).toBe(false);
    await setNotificationsEnabled(true);
    expect(await getNotificationsEnabled()).toBe(true);
  });

  it('skips scheduling the streak-risk notification when disabled', async () => {
    await setNotificationsEnabled(false);
    expect(await scheduleStreakRiskNotification(laterExpiry(), 'Alex')).toBeNull();
  });

  it('schedules the streak-risk notification when enabled', async () => {
    await setNotificationsEnabled(true);
    expect(await scheduleStreakRiskNotification(laterExpiry(), 'Alex')).toBe('notif-1');
  });
});

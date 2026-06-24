// #4 Revive — reconnect reminder notification (local, rescheduled on activity).

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('rid'),
  cancelScheduledNotificationAsync: jest.fn().mockResolvedValue(undefined),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const mockSingle = jest.fn();
jest.mock('../lib/supabase', () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ single: mockSingle }) }) }) },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { scheduleReconnectNotification } from '../hooks/useNotifications';
import { setNotificationsEnabled } from '../lib/notificationPrefs';

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('rid');
  mockSingle
    .mockResolvedValueOnce({ data: { user_a: 'me', user_b: 'friend' } })   // friendship
    .mockResolvedValueOnce({ data: { display_name: 'Otto', username: 'otto' } }); // friend profile
});

describe('scheduleReconnectNotification', () => {
  it('schedules a reconnect reminder ~10 days out and stores its id', async () => {
    await scheduleReconnectNotification('f1', 'me');
    expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledTimes(1);
    const arg = (Notifications.scheduleNotificationAsync as jest.Mock).mock.calls[0][0];
    expect(arg.content.data).toMatchObject({ type: 'reconnect', friendshipId: 'f1', screen: 'home' });
    const days = (arg.trigger.date.getTime() - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(9);
    expect(days).toBeLessThan(11);
    expect(await AsyncStorage.getItem('reconnect_notif_f1')).toBe('rid');
  });

  it('cancels a previously scheduled reminder for the same friendship', async () => {
    await AsyncStorage.setItem('reconnect_notif_f1', 'old-id');
    await scheduleReconnectNotification('f1', 'me');
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('old-id');
  });

  it('does nothing when notifications are turned off', async () => {
    await setNotificationsEnabled(false);
    await scheduleReconnectNotification('f1', 'me');
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
    await setNotificationsEnabled(true);
  });
});

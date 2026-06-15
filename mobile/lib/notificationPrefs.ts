import AsyncStorage from '@react-native-async-storage/async-storage';

// Local on/off switch for all notifications. Default ON. "Respecting" it means:
// streak-risk scheduling is skipped when off, and the push token is cleared so
// other users' clients can't push this device (see applyNotificationPreference).
export const NOTIFICATIONS_KEY = 'reconnect.notifications';

export async function getNotificationsEnabled(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(NOTIFICATIONS_KEY)) !== 'false';
  } catch {
    return true; // default on
  }
}

export async function setNotificationsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, enabled ? 'true' : 'false');
  } catch {
    // best-effort persistence
  }
}

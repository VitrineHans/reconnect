import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { getNotificationsEnabled } from '../lib/notificationPrefs';
import { registerForPushNotifications } from './usePushToken';

const RECONNECT_DAYS = 10;

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
  if (!(await getNotificationsEnabled())) return null;
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

/**
 * Reveal push (REVEAL-02 / PUSH-04): once both friends have answered, notify the
 * friend that their reveal is ready. Called by the second submitter's client
 * after their response lands (see record.tsx). Resolves to true when a push was
 * sent. Never throws — a failed reveal push must not break the submit flow.
 *
 * This is the client-side path. The robust server-side alternative
 * (supabase/functions/notify-reveal) fires from a DB trigger regardless of
 * client state; enable that — and drop this call — once it is deployed, to
 * avoid double-notifying.
 */
export async function notifyFriendOfReveal(
  friendshipId: string,
  currentUserId: string,
): Promise<boolean> {
  try {
    const { data: friendship } = await supabase
      .from('friendships')
      .select('user_a, user_b')
      .eq('id', friendshipId)
      .single();
    if (!friendship) return false;

    const friendId =
      friendship.user_a === currentUserId ? friendship.user_b : friendship.user_a;

    const { data: friendProfile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', friendId)
      .single();

    const pushToken = (friendProfile as { push_token?: string } | null)?.push_token;
    if (!pushToken) return false;

    // Sent in the sender's language; localize to the recipient's stored locale
    // once profiles persist a language preference.
    await sendExpoPushNotification(
      pushToken,
      i18n.t('flow.pushRevealTitle'),
      i18n.t('flow.pushRevealBody'),
      { friendshipId, screen: 'reveal' },
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Apply a notification on/off choice to the push token: when turned off, clear
 * the stored token so other users' clients can't push this device; when turned
 * back on, re-register and store a fresh token. (The local on/off flag itself is
 * persisted separately via setNotificationsEnabled.)
 */
export async function applyNotificationPreference(userId: string, enabled: boolean): Promise<void> {
  if (!enabled) {
    await supabase.from('profiles').update({ push_token: null }).eq('id', userId);
    return;
  }
  const token = await registerForPushNotifications();
  if (token) {
    await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
  }
}

/**
 * Revive a fading friendship via a notification (not an in-app nudge). Schedules
 * a local "reconnect with {name}" reminder for RECONNECT_DAYS from now, replacing
 * any previously scheduled one for this friendship. Called whenever you answer,
 * so the timer keeps resetting while you're active and only fires if the
 * friendship goes quiet. Best-effort; respects the notifications toggle.
 */
export async function scheduleReconnectNotification(
  friendshipId: string,
  currentUserId: string,
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!(await getNotificationsEnabled())) return;

  const key = `reconnect_notif_${friendshipId}`;
  try {
    const previous = await AsyncStorage.getItem(key);
    if (previous) await Notifications.cancelScheduledNotificationAsync(previous);
  } catch {
    // ignore — we'll just schedule a fresh one
  }

  let name = i18n.t('notifications.friendFallback');
  try {
    const { data: friendship } = await supabase
      .from('friendships').select('user_a, user_b').eq('id', friendshipId).single();
    if (friendship) {
      const friendId = friendship.user_a === currentUserId ? friendship.user_b : friendship.user_a;
      const { data: profile } = await supabase
        .from('profiles').select('username, display_name').eq('id', friendId).single();
      const p = profile as { username?: string; display_name?: string } | null;
      name = p?.display_name ?? p?.username ?? name;
    }
  } catch {
    // fall back to the generic friend name
  }

  try {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('notifications.reconnectTitle'),
        body: i18n.t('notifications.reconnectBody', { name }),
        data: { type: 'reconnect', friendshipId, screen: 'home' },
      },
      trigger: {
        date: new Date(Date.now() + RECONNECT_DAYS * 24 * 60 * 60 * 1000),
        type: Notifications.SchedulableTriggerInputTypes.DATE,
      },
    });
    await AsyncStorage.setItem(key, id);
  } catch {
    // scheduling is best-effort
  }
}

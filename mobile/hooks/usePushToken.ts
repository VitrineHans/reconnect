import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulators cannot receive push

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
  return data;
}

export function usePushToken(session: Session | null): void {
  const registered = useRef(false);

  useEffect(() => {
    if (!session?.user?.id || registered.current) return;
    registered.current = true;

    registerForPushNotificationsAsync().then(async (token) => {
      if (!token) return;
      await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', session.user.id);
    });
  }, [session?.user?.id]);
}

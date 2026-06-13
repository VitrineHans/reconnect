import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_800ExtraBold_Italic,
} from '@expo-google-fonts/nunito';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { usePushToken } from '../hooks/usePushToken';
import { colors } from '../theme/tokens';
import * as Notifications from 'expo-notifications';

export default function RootLayout() {
  const { session, loading } = useSession();
  const { profile, profileLoading } = useProfile(session);
  const segments = useSegments();
  const router = useRouter();
  usePushToken(session);

  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_800ExtraBold_Italic,
  });

  useEffect(() => {
    if (loading || profileLoading || !fontsLoaded) return;

    const inAuth = segments[0] === '(auth)';
    const inOnboarding = segments[0] === '(onboarding)';

    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && profile?.username === '' && !inOnboarding) {
      router.replace('/(onboarding)/username');
    } else if (session && profile?.username && profile.username !== '' && !profile?.onboarding_answers && !inOnboarding) {
      router.replace('/(onboarding)/questionnaire');
    } else if (
      session &&
      profile?.username &&
      profile.username !== '' &&
      profile?.onboarding_answers &&
      segments[0] !== '(tabs)' &&
      !(segments[0] === '(onboarding)' && (segments as string[])[1] === 'questionnaire')
    ) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, profile, profileLoading, fontsLoaded]);

  useEffect(() => {
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data as Record<string, unknown>;
      const friendshipId = data?.friendshipId as string | undefined;
      const screen = data?.screen as string | undefined;
      if (friendshipId && screen === 'reveal') {
        router.push(`/friendship/${friendshipId}/reveal` as never);
      } else if (friendshipId && screen === 'question') {
        router.push(`/friendship/${friendshipId}/question` as never);
      } else if (screen === 'friends') {
        router.push('/(tabs)/friends' as never);
      }
    });
    return () => sub.remove();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

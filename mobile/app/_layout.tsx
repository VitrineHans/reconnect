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
      !(segments[0] === '(onboarding)' && segments[1] === 'questionnaire')
    ) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, profile, profileLoading, fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return <Slot />;
}

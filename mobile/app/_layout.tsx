import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useFonts } from 'expo-font';
import { Fraunces_700Bold, Fraunces_700Bold_Italic } from '@expo-google-fonts/fraunces';
import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
} from '@expo-google-fonts/plus-jakarta-sans';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { usePushToken } from '../hooks/usePushToken';
import { colors } from '../theme/tokens';

export default function RootLayout() {
  const { session, loading } = useSession();
  const { profile, profileLoading } = useProfile(session);
  const segments = useSegments();
  const router = useRouter();
  usePushToken(session); // PUSH-01, PUSH-02: silent background registration

  const [fontsLoaded] = useFonts({
    Fraunces_700Bold,
    Fraunces_700Bold_Italic,
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
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
    } else if (session && profile?.username && profile.username !== '' && profile?.onboarding_answers && (inAuth || inOnboarding)) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading, profile, profileLoading, fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={colors.ember} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

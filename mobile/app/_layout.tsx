import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { usePushToken } from '../hooks/usePushToken';

export default function RootLayout() {
  const { session, loading } = useSession();
  const { profile, profileLoading } = useProfile(session);
  const segments = useSegments();
  const router = useRouter();
  usePushToken(session); // PUSH-01, PUSH-02: silent background registration

  useEffect(() => {
    if (loading || profileLoading) return;

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
  }, [session, loading, profile, profileLoading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

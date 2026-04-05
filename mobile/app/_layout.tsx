import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useSession } from '../hooks/useSession';
import { usePushToken } from '../hooks/usePushToken';

export default function RootLayout() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  usePushToken(session); // PUSH-01, PUSH-02: silent background registration

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    if (!session && !inAuth) {
      router.replace('/(auth)/login');
    } else if (session && inAuth) {
      router.replace('/(tabs)/home');
    }
  }, [session, loading]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}

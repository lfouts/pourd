import '../global.css';
import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { AuthProvider, useAuth } from '@/lib/auth-context';

function RootLayoutInner() {
  const { userId } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (userId === undefined) return;
    const inAuthGroup = segments[0] === '(auth)';
    if (!userId && !inAuthGroup) router.replace('/(auth)/sign-in');
    else if (userId && inAuthGroup) router.replace('/(tabs)');
  }, [userId, segments]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="checkin" options={{ presentation: 'modal' }} />
      <Stack.Screen name="wine/[id]" />
      <Stack.Screen name="user/[id]" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutInner />
    </AuthProvider>
  );
}

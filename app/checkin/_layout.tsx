import { Stack } from 'expo-router';

export default function CheckinLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1c1917' },
        headerTintColor: '#e0476c',
        headerTitleStyle: { color: '#fff', fontWeight: '600' },
        contentStyle: { backgroundColor: '#0c0a09' },
      }}
    />
  );
}

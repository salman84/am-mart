import { Stack } from 'expo-router';

export default function TopupLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="confirm" />
      <Stack.Screen name="history" />
    </Stack>
  );
}

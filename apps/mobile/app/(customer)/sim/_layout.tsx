import { Stack } from 'expo-router';

export default function SimLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="reserve" />
    </Stack>
  );
}

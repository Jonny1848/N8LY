/**
 * Nested Stack fuer Story-Erstellung: Capture -> Editor -> Review.
 * Kein Header – Vollbild wie bei Instagram.
 */
import { Stack } from 'expo-router';

export default function StoryCreateLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
      }}
    />
  );
}

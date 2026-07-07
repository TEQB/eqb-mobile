import "../src/globals.css";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AppProviders } from "@/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="course/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="question/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="upload" options={{ presentation: "modal" }} />
        <Stack.Screen name="contributions" />
        <Stack.Screen name="feedback" options={{ presentation: "modal" }} />
      </Stack>
    </AppProviders>
  );
}

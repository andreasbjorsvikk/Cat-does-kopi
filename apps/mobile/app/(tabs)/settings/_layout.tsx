import { Stack } from "expo-router";
import useColorScheme from "@/hooks/useColorScheme";

export default function SettingsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: isDark ? "#030712" : "#F9FAFB",
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="connected-apps" options={{ headerShown: true, title: "Tilkoblede apper" }} />
      <Stack.Screen name="profile" options={{ headerShown: true, title: "Profilinnstillinger" }} />
      <Stack.Screen name="appearance" options={{ headerShown: true, title: "Utseende" }} />
      <Stack.Screen name="preferences" options={{ headerShown: true, title: "Preferanser" }} />
      <Stack.Screen name="privacy" options={{ headerShown: true, title: "Personvern" }} />
      <Stack.Screen name="training" options={{ headerShown: true, title: "Trening" }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: "Varsler" }} />
      <Stack.Screen name="help" options={{ headerShown: true, title: "Hjelp & Support" }} />
    </Stack>
  );
}
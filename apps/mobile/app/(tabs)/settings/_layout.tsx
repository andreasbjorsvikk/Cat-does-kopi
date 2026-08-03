import { Stack } from "expo-router";
import useColorScheme from "@/hooks/useColorScheme";
import { useLanguage } from "@/context/LanguageContext";

export default function SettingsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();

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
      <Stack.Screen name="connected-apps" options={{ headerShown: true, title: t("settings.sync") }} />
      <Stack.Screen name="profile" options={{ headerShown: true, title: t("profile.profileSettings") }} />
      <Stack.Screen name="appearance" options={{ headerShown: true, title: t("settings.appearance") }} />
      <Stack.Screen name="preferences" options={{ headerShown: true, title: t("settings.preferences") }} />
      <Stack.Screen name="privacy" options={{ headerShown: true, title: t("privacy.title") }} />
      <Stack.Screen name="training" options={{ headerShown: true, title: t("settings.training") }} />
      <Stack.Screen name="notifications" options={{ headerShown: true, title: t("notif.title") }} />
      <Stack.Screen name="help" options={{ headerShown: true, title: t("help.title") }} />
    </Stack>
  );
}
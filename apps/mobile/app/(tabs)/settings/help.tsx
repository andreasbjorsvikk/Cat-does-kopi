import React from "react";
import { View, StyleSheet } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { useLocalSearchParams } from "expo-router";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";
import { useLanguage } from "@/context/LanguageContext";

export default function PlaceholderPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { title } = useLocalSearchParams();
  const { t } = useLanguage();

  const themeClasses = {
    bg: isDark ? "bg-background-950" : "bg-background-0",
    text: isDark ? "text-typography-50" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
  };

  return (
    <View style={flattenStyle([styles.container, isDark ? styles.bgDark : styles.bgLight])}>
      <Heading className={themeClasses.text}>{title || t("common.placeholderTitle")}</Heading>
      <Text className={`mt-2 ${themeClasses.textMuted} text-center`}>
        {t("common.placeholderDesc")}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  bgLight: {
    backgroundColor: "#F9FAFB",
  },
  bgDark: {
    backgroundColor: "#030712",
  },
});
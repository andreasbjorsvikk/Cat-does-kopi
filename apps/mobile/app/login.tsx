import React, { useState } from "react";
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ImageBackground,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { Button, ButtonText, ButtonIcon, ButtonSpinner } from "@/components/ui/button";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Mail, Lock, LogIn, ArrowRight } from "lucide-react-native";
import { useRouter } from "expo-router";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";
import { useLanguage } from "@/context/LanguageContext";

const { height } = Dimensions.get("window");

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, language } = useLanguage();

  const handleLogin = async () => {
    if (!email || !password) {
      setError(t("auth.fillAllFields"));
      return;
    }

    setLoading(true);
    setError(null);
    
    const normalizedEmail = email.trim().toLowerCase();
    console.log("[Login Attempt Diagnostics]");
    console.log("- Normalized Email (safe):", normalizedEmail.substring(0, 3) + "..." + normalizedEmail.split('@')[1]);
    console.log("- Email String Type:", typeof normalizedEmail);
    console.log("- Email Length:", normalizedEmail.length);
    console.log("- Password Length (at start):", password.length);
    console.log("- Password Type:", typeof password);
    console.log("- Password Is Empty:", password.length === 0);
    console.log("- Project URL:", (supabase as any).supabaseUrl);
    
    const anonKey = (supabase as any).supabaseKey;
    if (anonKey) {
      console.log("- apikey header (sanitized):", anonKey.substring(0, 5) + "..." + anonKey.substring(anonKey.length - 5));
    } else {
      console.error("- ERROR: apikey/anonKey is missing from supabase client!");
    }

    try {
      console.log("- Final Password Length before Auth call:", password.length);
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) throw error;
      
      // Navigation will be handled by the layout's auth gate
    } catch (err: any) {
      console.error("[Login Error Details]");
      console.error("- Message:", err.message);
      console.error("- Code:", err.code);
      console.error("- Status:", err.status);
      console.error("- Project URL used:", (supabase as any).supabaseUrl);
      setError(err.message || t("auth.errorSignIn"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={flattenStyle([styles.container, isDark ? styles.containerDark : styles.containerLight])}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        bounces={false}
        keyboardShouldPersistTaps="handled"
      >
        <ImageBackground
          source={require("../assets/images/mountains.png")}
          style={styles.header}
          resizeMode="cover"
        >
          <View style={styles.overlay} />
          <VStack style={styles.headerContent} space="md">
            <View style={styles.logoContainer}>
              <LogIn size={40} color="#FFFFFF" />
            </View>
            <VStack space="xs">
              <Heading size="3xl" className="text-white font-extrabold text-center">
                {t("common.appName")}
              </Heading>
            </VStack>
            <Text className="text-white/80 text-center text-lg">
              {t("auth.partnerActiveLifestyle")}
            </Text>
          </VStack>
        </ImageBackground>

        <View style={flattenStyle([styles.formContainer, isDark ? styles.formDark : styles.formLight])}>
          <VStack space="xl">
            <VStack space="xs">
              <Heading size="xl" className={isDark ? "text-white" : "text-typography-950"}>
                {t("welcome.title")}
              </Heading>
              <Text className={isDark ? "text-white/70" : "text-typography-500"}>
                {t("auth.loginJourney")}
              </Text>
            </VStack>

            <VStack space="md">
              <VStack space="xs">
                <Text className={`font-medium ${isDark ? "text-white/90" : "text-typography-700"}`}>
                  {t("auth.email")}
                </Text>
                <Input size="lg" className={isDark ? "border-outline-700" : "border-outline-200"}>
                  <InputSlot className="pl-3">
                    <InputIcon as={Mail} color={isDark ? "#FFFFFF" : "#6B7280"} />
                  </InputSlot>
                  <InputField
                    placeholder={t("auth.emailPlaceholder")}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    className={isDark ? "text-white" : "text-typography-950"}
                  />
                </Input>
              </VStack>

              <VStack space="xs">
                <Text className={`font-medium ${isDark ? "text-white/90" : "text-typography-700"}`}>
                  {t("auth.password")}
                </Text>
                <Input size="lg" className={isDark ? "border-outline-700" : "border-outline-200"}>
                  <InputSlot className="pl-3">
                    <InputIcon as={Lock} color={isDark ? "#FFFFFF" : "#6B7280"} />
                  </InputSlot>
                  <InputField
                    placeholder={t("auth.passwordPlaceholder")}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                    value={password}
                    onChangeText={(val) => {
                      console.log("- Password length changed to:", val.length);
                      setPassword(val);
                    }}
                    secureTextEntry
                    className={isDark ? "text-white" : "text-typography-950"}
                  />
                </Input>
              </VStack>

              {error && (
                <Text className="text-red-500 text-sm font-medium">
                  {error}
                </Text>
              )}

              <TouchableOpacity onPress={() => router.push("/forgot-password")} disabled={loading}>
                <Text className="text-right text-sm text-emerald-500 font-semibold py-1">
                  {t("auth.forgotPassword")}
                </Text>
              </TouchableOpacity>
            </VStack>

            <VStack space="md" className="pt-4">
              <Button
                onPress={handleLogin}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 h-14 rounded-2xl"
              >
                {loading ? <ButtonSpinner /> : (
                  <>
                    <ButtonText className="text-white font-bold text-lg">{t("settings.signIn")}</ButtonText>
                    <ButtonIcon as={ArrowRight} className="ml-2" color="white" />
                  </>
                )}
              </Button>

              <TouchableOpacity onPress={() => router.push("/signup")} disabled={loading}>
                <HStack space="xs" className="justify-center items-center py-2">
                  <Text className={isDark ? "text-white/70" : "text-typography-500"}>
                    {t("auth.noAccount")}
                  </Text>
                  <Text className="text-emerald-500 font-bold">{t("auth.signup")}</Text>
                </HStack>
              </TouchableOpacity>
            </VStack>
          </VStack>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerLight: {
    backgroundColor: "#FFFFFF",
  },
  containerDark: {
    backgroundColor: "#030712",
  },
  header: {
    height: height * 0.4,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 185, 129, 0.6)", // Emerald overlay
  },
  headerContent: {
    alignItems: "center",
    zIndex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  formContainer: {
    flex: 1,
    marginTop: -30,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  formLight: {
    backgroundColor: "#FFFFFF",
  },
  formDark: {
    backgroundColor: "#030712",
  },
});
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
  Alert,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { Button, ButtonText, ButtonIcon, ButtonSpinner } from "@/components/ui/button";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Mail, Lock, User, UserPlus, ArrowLeft } from "lucide-react-native";
import { useRouter } from "expo-router";
import useColorScheme from "@/hooks/useColorScheme";
import { useLanguage } from "@/context/LanguageContext";

const { height } = Dimensions.get("window");

export default function SignupScreen() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t, language } = useLanguage();

  const handleSignUp = async () => {
    if (!email || !password || !username || !confirmPassword) {
      setError(t("auth.fillAllFields"));
      return;
    }

    if (password !== confirmPassword) {
      setError(t("auth.passwordsDontMatch"));
      return;
    }

    if (password.length < 6) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setLoading(true);
    setError(null);
    
    const normalizedEmail = email.trim().toLowerCase();
    
    console.log("[Signup Attempt Diagnostics]");
    console.log("- Normalized Email:", normalizedEmail);
    console.log("- Username:", username.trim());
    console.log("- Project URL:", (supabase as any).supabaseUrl);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            username: username.trim(),
            display_name: username.trim(),
          },
        },
      });

      console.log("[Signup Result Details]");
      if (error) {
        console.error("- Error Code:", error.code);
        console.error("- Error Message:", error.message);
        console.error("- Error Status:", error.status);
        throw error;
      }

      console.log("- Session exists:", !!data.session);
      console.log("- User exists:", !!data.user);
      if (data.user) {
        console.log("- User Identities:", data.user.identities?.length || 0);
        console.log("- User Confirmation Sent:", !!data.user.confirmation_sent_at);
      }

      Alert.alert(t("auth.success"), t("auth.confirmationSent"), [{
        text: t("common.ok"),
        onPress: () => router.push("/login")
      }]);
    } catch (err: any) {
      setError(err.message || t("auth.errorSignUp"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, isDark ? styles.containerDark : styles.containerLight]}
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
          <TouchableOpacity 
            style={styles.backButton} 
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <VStack style={styles.headerContent} space="md">
            <View style={styles.logoContainer}>
              <UserPlus size={40} color="#FFFFFF" />
            </View>
            <Heading size="3xl" className="text-white font-extrabold text-center">
              {t("auth.createAccount")}
            </Heading>
            <Text className="text-white/80 text-center text-lg">
              {t("auth.joinJourney")}
            </Text>
          </VStack>
        </ImageBackground>

        <View style={[styles.formContainer, isDark ? styles.formDark : styles.formLight]}>
          <VStack space="xl">
            <VStack space="md">
              <VStack space="xs">
                <Text className={`font-medium ${isDark ? "text-white/90" : "text-typography-700"}`}>
                  {t("settings.username")}
                </Text>
                <Input size="lg" className={isDark ? "border-outline-700" : "border-outline-200"}>
                  <InputSlot className="pl-3">
                    <InputIcon as={User} color={isDark ? "#FFFFFF" : "#6B7280"} />
                  </InputSlot>
                  <InputField
                    placeholder={t("settings.usernamePlaceholder")}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                    value={username}
                    onChangeText={setUsername}
                    className={isDark ? "text-white" : "text-typography-950"}
                  />
                </Input>
              </VStack>

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
                    onChangeText={setEmail}
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
                    placeholder={t("auth.choosePassword")}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    className={isDark ? "text-white" : "text-typography-950"}
                  />
                </Input>
              </VStack>

              <VStack space="xs">
                <Text className={`font-medium ${isDark ? "text-white/90" : "text-typography-700"}`}>
                  {t("auth.confirmPassword")}
                </Text>
                <Input size="lg" className={isDark ? "border-outline-700" : "border-outline-200"}>
                  <InputSlot className="pl-3">
                    <InputIcon as={Lock} color={isDark ? "#FFFFFF" : "#6B7280"} />
                  </InputSlot>
                  <InputField
                    placeholder={t("auth.repeatPassword")}
                    placeholderTextColor={isDark ? "#9CA3AF" : "#9CA3AF"}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
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
            </VStack>

            <VStack space="md" className="pt-4">
              <Button
                onPress={handleSignUp}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 h-14 rounded-2xl"
              >
                {loading ? <ButtonSpinner /> : (
                  <ButtonText className="text-white font-bold text-lg">{t("auth.signup")}</ButtonText>
                )}
              </Button>

              <TouchableOpacity onPress={() => router.push("/login")} disabled={loading}>
                <HStack space="xs" className="justify-center items-center py-2">
                  <Text className={isDark ? "text-white/70" : "text-typography-500"}>
                    {t("auth.hasAccount")}
                  </Text>
                  <Text className="text-emerald-500 font-bold">{t("settings.signIn")}</Text>
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
    height: height * 0.35,
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 185, 129, 0.6)",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerContent: {
    alignItems: "center",
    zIndex: 1,
    paddingHorizontal: 20,
  },
  logoContainer: {
    width: 70,
    height: 70,
    borderRadius: 20,
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
    paddingTop: 30,
    paddingBottom: 40,
  },
  formLight: {
    backgroundColor: "#FFFFFF",
  },
  formDark: {
    backgroundColor: "#030712",
  },
});
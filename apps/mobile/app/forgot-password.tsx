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
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Mail, ArrowLeft, Send } from "lucide-react-native";
import { useRouter } from "expo-router";
import useColorScheme from "@/hooks/useColorScheme";

const { height } = Dimensions.get("window");

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const handleResetRequest = async () => {
    if (!email) {
      setError("Vennligst oppgi din e-postadresse");
      return;
    }

    setLoading(true);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();

    try {
      // Use the specific deep link requested by the user for mobile
      // and the preview origin for web testing
      const redirectTo = Platform.OS === 'web'
        ? `${window.location.origin}/reset-password`
        : 'com.andreasbjorsvik.treningsappen://reset-password';

      console.log("[Forgot Password] Sending reset request");
      console.log("- Email:", normalizedEmail);
      console.log("- RedirectTo:", redirectTo);

      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: redirectTo,
      });

      if (error) throw error;

      Alert.alert(
        "E-post sendt",
        "En lenke for å tilbakestille passordet er sendt til din e-postadresse.",
        [{ text: "OK", onPress: () => router.push("/login") }]
      );
    } catch (err: any) {
      setError(err.message || "Kunne ikke sende forespørsel");
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
              <Mail size={40} color="#FFFFFF" />
            </View>
            <Heading size="3xl" className="text-white font-extrabold text-center">
              Glemt passord?
            </Heading>
            <Text className="text-white/80 text-center text-lg">
              Vi hjelper deg med å få tilgang igjen
            </Text>
          </VStack>
        </ImageBackground>

        <View style={[styles.formContainer, isDark ? styles.formDark : styles.formLight]}>
          <VStack space="xl">
            <VStack space="md">
              <Text className={isDark ? "text-white/70" : "text-typography-500"}>
                Oppgi e-postadressen din, så sender vi deg en lenke for å velge et nytt passord.
              </Text>
              
              <VStack space="xs">
                <Text className={`font-medium ${isDark ? "text-white/90" : "text-typography-700"}`}>
                  E-post
                </Text>
                <Input size="lg" className={isDark ? "border-outline-700" : "border-outline-200"}>
                  <InputSlot className="pl-3">
                    <InputIcon as={Mail} color={isDark ? "#FFFFFF" : "#6B7280"} />
                  </InputSlot>
                  <InputField
                    placeholder="Din e-post"
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

              {error && (
                <Text className="text-red-500 text-sm font-medium">
                  {error}
                </Text>
              )}
            </VStack>

            <VStack space="md" className="pt-4">
              <Button
                onPress={handleResetRequest}
                disabled={loading}
                className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 h-14 rounded-2xl"
              >
                {loading ? <ButtonSpinner /> : (
                  <>
                    <ButtonText className="text-white font-bold text-lg">Send lenke</ButtonText>
                  </>
                )}
              </Button>

              <TouchableOpacity onPress={() => router.push("/login")} disabled={loading}>
                <HStack space="xs" className="justify-center items-center py-2">
                  <Text className={isDark ? "text-white/70" : "text-typography-500"}>
                    Husker du passordet?
                  </Text>
                  <Text className="text-emerald-500 font-bold">Logg inn</Text>
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
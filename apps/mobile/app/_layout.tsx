import "@/global.css";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import "react-native-reanimated";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import GluestackInitializer from "@/components/GluestackInitializer";
import useColorScheme from "@/hooks/useColorScheme";
import { Stack, useRouter, useSegments } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import { RouteProvider } from "@/context/RouteContext";

// Initialize CatDoes Watch for error tracking
// Set EXPO_PUBLIC_CATDOES_WATCH_KEY in your environment to enable
import { initCatDoesWatch } from "@/catdoes.watch";
initCatDoesWatch();

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

function InitialLayout() {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const handleDeepLink = async (event: { url: string }) => {
      const { url } = event;
      console.log("[Deep Link Received]:", url.split("#")[0]); // Log the URL without the sensitive hash

      if (url.includes("#access_token=")) {
        const parts = url.split("#")[1].split("&");
        const params: Record<string, string> = {};
        parts.forEach((p) => {
          const [key, val] = p.split("=");
          params[key] = val;
        });

        if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });

          if (!error) {
            // If it's a recovery link, navigate to reset-password
            if (params.type === "recovery") {
              router.replace("/reset-password");
            }
          }
        }
      }
    };

    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check for initial URL
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === "(tabs)";
    const isAuthScreen = segments[0] === "login" || segments[0] === "signup" || segments[0] === "reset-password" || segments[0] === "forgot-password";

    if (!user && !isAuthScreen) {
      // Redirect to login if not authenticated and not already on login screen
      router.replace("/login");
    } else if (user && isAuthScreen) {
      // Redirect to tabs if authenticated and on login screen
      router.replace("/(tabs)");
    }
  }, [user, loading, segments]);

  if (loading) {
    return null; // Keep splash screen or show a loader
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "white" },
      }}
    >
      <Stack.Screen name="login" options={{ gestureEnabled: false }} />
      <Stack.Screen name="signup" options={{ gestureEnabled: false }} />
      <Stack.Screen name="forgot-password" options={{ gestureEnabled: false }} />
      <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  /*
   * IMPORTANT: DO NOT REMOVE GluestackInitializer OR ErrorBoundary */
  return (
    <ErrorBoundary>
      <GluestackInitializer colorScheme={colorScheme}>
        <RouteProvider>
          <InitialLayout />
        </RouteProvider>
        <StatusBar style="auto" />
      </GluestackInitializer>
    </ErrorBoundary>
  );
}

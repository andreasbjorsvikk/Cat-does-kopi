import React, { useState, useEffect } from "react";
import { View, ScrollView, StyleSheet, Image, Platform, Linking, ActivityIndicator } from "react-native";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Button, ButtonText, ButtonSpinner } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, RefreshCw } from "lucide-react-native";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";
import { stravaService } from "@/services/stravaService";
import { appleHealthService } from "@/services/appleHealthService";
import { useAuth } from "@/hooks/useAuth";

export default function ConnectedAppsPage() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { user } = useAuth();

  const [stravaConnected, setStravaConnected] = useState<boolean | null>(null);
  const [healthConnected, setHealthConnected] = useState<boolean | null>(null);
  const [stravaLoading, setStravaLoading] = useState(false);
  const [healthLoading, setHealthLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const strava = await stravaService.getStatus();
      setStravaConnected(strava.connected);
      const health = await appleHealthService.getStatus();
      setHealthConnected(health.connected);
    } catch (err) {
      console.warn("Failed to load connection status", err);
    }
  };

  const handleStravaConnect = async () => {
    setStravaLoading(true);
    try {
      if (stravaConnected) {
        await stravaService.disconnect();
        setStravaConnected(false);
      } else {
        const { url } = await stravaService.getConnectUrl();
        Linking.openURL(url);
        // User will be redirected back, so we might not see the update immediately
      }
    } catch (err) {
      console.warn("Strava action failed", err);
    } finally {
      setStravaLoading(false);
    }
  };

  const handleHealthConnect = async () => {
    setHealthLoading(true);
    try {
      if (healthConnected) {
        await appleHealthService.disconnect();
        setHealthConnected(false);
      } else {
        await appleHealthService.connect();
        setHealthConnected(true);
      }
    } catch (err) {
      console.warn("Health action failed", err);
    } finally {
      setHealthLoading(false);
    }
  };

  const handleStravaSync = async () => {
    setSyncing(true);
    try {
      await stravaService.sync();
      // Potentially show success toast
    } catch (err) {
      console.warn("Strava sync failed", err);
    } finally {
      setSyncing(false);
    }
  };

  const themeClasses = {
    bg: isDark ? "bg-background-950" : "bg-background-0",
    text: isDark ? "text-typography-50" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    cardBg: isDark ? "bg-background-900 border-outline-800" : "bg-background-50 border-outline-100",
  };

  return (
    <ScrollView 
      style={flattenStyle([styles.container, isDark ? styles.bgDark : styles.bgLight])}
      contentContainerStyle={styles.contentContainer}
    >
      <VStack style={{ gap: 20 }}>
        <Text className={themeClasses.textMuted}>
          Koble til andre apper for å automatisk synkronisere treningsøktene dine med Treningsappen.
        </Text>

        {/* Apple Health Card */}
        <Card className={`p-4 ${themeClasses.cardBg}`} style={styles.card}>
          <HStack style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={styles.appIconContainer}>
              <Image 
                source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_Health_logo.png" }} 
                style={styles.appIcon}
                resizeMode="contain"
              />
            </View>
            <VStack style={{ flex: 1, marginLeft: 12 }}>
              <Heading size="sm" className={themeClasses.text}>
                {Platform.OS === "ios" ? "Apple Health" : "Google Fit"}
              </Heading>
              <HStack style={{ alignItems: "center", gap: 4 }}>
                {healthConnected ? (
                  <>
                    <CheckCircle2 size={12} color="#10B981" />
                    <Text className="text-xs text-emerald-500 font-bold">Tilkoblet</Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} color="#9CA3AF" />
                    <Text className="text-xs text-typography-500">Ikke tilkoblet</Text>
                  </>
                )}
              </HStack>
            </VStack>
          </HStack>

          <Text className={`text-xs mb-4 ${themeClasses.textMuted}`}>
            Henter automatisk treningsdata, skritt og puls fra {Platform.OS === "ios" ? "HealthKit" : "Google Fit"}.
          </Text>

          <Button 
            variant={healthConnected ? "outline" : "solid"}
            size="sm"
            onPress={handleHealthConnect}
            className={healthConnected ? "border-outline-300" : "bg-emerald-500 data-[hover=true]:bg-emerald-600"}
          >
            {healthLoading ? (
              <ButtonSpinner color={healthConnected ? "#10B981" : "#FFFFFF"} />
            ) : (
              <ButtonText className={healthConnected ? themeClasses.text : "text-white"}>
                {healthConnected ? "Koble fra" : "Koble til"}
              </ButtonText>
            )}
          </Button>
        </Card>

        {/* Strava Card */}
        <Card className={`p-4 ${themeClasses.cardBg}`} style={styles.card}>
          <HStack style={{ alignItems: "center", marginBottom: 16 }}>
            <View style={flattenStyle([styles.appIconContainer, { backgroundColor: "#FC642D" }])}>
              <Image 
                source={{ uri: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Strava_Logo.svg/1024px-Strava_Logo.svg.png" }} 
                style={flattenStyle([styles.appIcon, { tintColor: "#FFFFFF" }])}
                resizeMode="contain"
              />
            </View>
            <VStack style={{ flex: 1, marginLeft: 12 }}>
              <Heading size="sm" className={themeClasses.text}>Strava</Heading>
              <HStack style={{ alignItems: "center", gap: 4 }}>
                {stravaConnected ? (
                  <>
                    <CheckCircle2 size={12} color="#FC642D" />
                    <Text className="text-xs text-[#FC642D] font-bold">Tilkoblet</Text>
                  </>
                ) : (
                  <>
                    <AlertCircle size={12} color="#9CA3AF" />
                    <Text className="text-xs text-typography-500">Ikke tilkoblet</Text>
                  </>
                )}
              </HStack>
            </VStack>
          </HStack>

          <Text className={`text-xs mb-4 ${themeClasses.textMuted}`}>
            Synkroniser dine GPS-spor, tider og rekorder fra Strava direkte til Treningsappen.
          </Text>

          <HStack style={{ gap: 8 }}>
            <Button 
              variant={stravaConnected ? "outline" : "solid"}
              size="sm"
              onPress={handleStravaConnect}
              className={flattenStyle([
                stravaConnected ? "border-outline-300" : "bg-[#FC642D] data-[hover=true]:bg-[#E34402]",
                { flex: 1 }
              ])}
            >
              {stravaLoading ? (
                <ButtonSpinner color={stravaConnected ? "#FC642D" : "#FFFFFF"} />
              ) : (
                <ButtonText className={stravaConnected ? themeClasses.text : "text-white"}>
                  {stravaConnected ? "Koble fra" : "Koble til Strava"}
                </ButtonText>
              )}
            </Button>

            {stravaConnected && (
              <Button 
                variant="outline"
                size="sm"
                onPress={handleStravaSync}
                className="border-outline-300"
                disabled={syncing}
              >
                {syncing ? (
                  <ButtonSpinner color="#10B981" />
                ) : (
                  <RefreshCw size={14} color={isDark ? "#FFFFFF" : "#111827"} />
                )}
              </Button>
            )}
          </HStack>
        </Card>
      </VStack>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLight: { backgroundColor: "#F9FAFB" },
  bgDark: { backgroundColor: "#030712" },
  contentContainer: { padding: 16, paddingBottom: 40 },
  card: { borderRadius: 20, borderWidth: 1 },
  appIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
    overflow: "hidden",
  },
  appIcon: { width: "100%", height: "100%" },
});
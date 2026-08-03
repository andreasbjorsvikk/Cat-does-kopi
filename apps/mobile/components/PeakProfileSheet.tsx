import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  Dimensions,
  Image,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { Button, ButtonText } from "@/components/ui/button";
import {
  X,
  Mountain,
  MapPin,
  Sun,
  Moon,
  Cloud,
  Wind,
  Users,
  Rss,
  Trophy,
  Info,
  User,
  CheckCircle,
  Navigation,
} from "lucide-react-native";
import { Peak } from "@/services/peakDbService";
import useColorScheme from "@/hooks/useColorScheme";
import { flattenStyle } from "@/utils/flatten-style";
import { PeakLeaderboard } from "./leaderboard/PeakLeaderboard";
import { supabase } from "@/lib/supabase";
import { WeatherTab } from "./WeatherTab";
import { getWeatherEmoji, isNightTime, mapWmoCodeToDescription, mapWmoCodeToEmoji } from "@/utils/weatherUtils";
import { useRoute } from "@/context/RouteContext";
import { useLanguage } from "@/context/LanguageContext";

interface PeakProfileSheetProps {
  peak: Peak;
  userLocation: { latitude: number; longitude: number } | null;
  canCheckin: boolean;
  checkinLoading: boolean;
  onCheckin: () => void;
  onClose: () => void;
}

type TabType = "info" | "feed" | "leaderboard" | "weather";

export function PeakProfileSheet({
  peak,
  userLocation,
  canCheckin,
  checkinLoading,
  onCheckin,
  onClose,
}: PeakProfileSheetProps) {
  const { createRoute, setIsPickingStart } = useRoute();
  const isDark = useColorScheme() === "dark";
  const { t, locale } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>("info");
  const [weatherData, setWeatherData] = useState<{
    temp: number;
    wind: number;
    symbol: string;
    description: string;
  } | null>(null);
  const [astronomy, setAstronomy] = useState<{
    sunrise: string;
    sunset: string;
  } | null>(null);
  const [fullForecast, setFullForecast] = useState<any[] | null>(null);
  const [dailyInfo, setDailyInfo] = useState<Record<string, any> | null>(null);

  // Formatting distance
  const getDistanceMeters = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ) => {
    const R = 6371e3; // meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const distance = React.useMemo(() => {
    if (!userLocation) return t('map.distanceUnknown');
    const d = getDistanceMeters(
      userLocation.latitude,
      userLocation.longitude,
      peak.latitude,
      peak.longitude
    );
    if (d < 1000) return `${Math.round(d)} m`;
    const km = (d / 1000).toFixed(1);
    const formattedKm = locale === 'nb-NO' ? km.replace(".", ",") : km;
    return `${formattedKm} ${t('metric.distance')}`;
  }, [userLocation, peak, t]);

  // Fetch real weather from Open-Meteo
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${peak.latitude}&longitude=${peak.longitude}&current=temperature_2m,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation,snow_depth,weather_code,wind_speed_10m,wind_direction_10m&daily=sunrise,sunset&timezone=auto&wind_speed_unit=ms&forecast_days=10`;
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Weather API returned ${response.status}`);
        }
        const json = await response.json();

        if (json.current && json.daily && json.hourly) {
          const current = json.current;
          const daily = json.daily;
          const hourly = json.hourly;
          const sunrise = daily.sunrise[0];
          const sunset = daily.sunset[0];

          // Use current.time from API for robust night detection in the same timezone
          const isNight = isNightTime(current.time, sunrise, sunset);
          const symbol = getWeatherEmoji(current.weather_code, isNight);

          setWeatherData({
            temp: Math.round(current.temperature_2m),
            wind: Math.round(current.wind_speed_10m),
            symbol: symbol,
            description: mapWmoCodeToDescription(current.weather_code),
          });

          setAstronomy({
            sunrise: sunrise.split("T")[1].substring(0, 5),
            sunset: sunset.split("T")[1].substring(0, 5),
          });

          // Format data for WeatherTab
          const formattedHourly = hourly.time.map((time: string, i: number) => {
            const hourlyUnits = json.hourly_units;
            const isWindKmH = (hourlyUnits?.wind_speed_10m_best_match || hourlyUnits?.wind_speed_10m) === 'km/h';

            const windSpeedRaw = hourly.wind_speed_10m_best_match?.[i] ?? hourly.wind_speed_10m?.[i] ?? 0;
            const windSpeed = isWindKmH ? windSpeedRaw / 3.6 : windSpeedRaw;

            const temp = hourly.temperature_2m_best_match?.[i] ?? hourly.temperature_2m?.[i] ?? 0;
            const precip = hourly.precipitation_best_match?.[i] ?? hourly.precipitation?.[i] ?? 0;
            const windDir = hourly.wind_direction_10m_best_match?.[i] ?? hourly.wind_direction_10m?.[i] ?? 0;
            const weatherCode = hourly.weather_code_best_match?.[i] ?? hourly.weather_code?.[i] ?? 0;
            const snowDepth = hourly.snow_depth_metno_nordic?.[i] ?? hourly.snow_depth_best_match?.[i] ?? hourly.snow_depth?.[i] ?? 0;

            return {
              time,
              temp,
              precip,
              windSpeed,
              windDir,
              symbol: mapWmoCodeToEmoji(weatherCode),
              wmoCode: weatherCode,
              snowDepth,
            };
          });

          const dailyMap: Record<string, any> = {};
          daily.time.forEach((date: string, i: number) => {
            dailyMap[date] = {
              sunrise: daily.sunrise[i],
              sunset: daily.sunset[i],
            };
          });

          setFullForecast(formattedHourly);
          setDailyInfo(dailyMap);
        }
      } catch (err) {
        console.warn("Failed to fetch weather", err);
      }
    };
    fetchWeather();
  }, [peak.id, peak.latitude, peak.longitude]);

  const showRouteOptions = () => {
    Alert.alert(
      t('map.createRoute'),
      t('map.howToStart'),
      [
        { 
          text: t('map.fromMyPosition'),
          onPress: async () => {
            if (!userLocation) {
              Alert.alert(t('common.error'), t('map.locationDenied'));
              return;
            }
            try {
              await createRoute(userLocation, peak);
              onClose(); 
            } catch (err) {
              Alert.alert(t('common.error'), t('map.createRouteError'));
            }
          } 
        },
        { 
          text: t('map.tab.map'),
          onPress: () => {
            // Important: Set picking state but do NOT call onClose().
            // MapView's conditional rendering will hide the sheet while keeping selectedPeak.
            setIsPickingStart(true);
          } 
        },
        { text: t('common.cancel'), style: "cancel" }
      ]
    );
  };

  const themeClasses = {
    text: "text-typography-900 dark:text-typography-50", // Ensuring light text in dark mode
    textMuted: "text-typography-500 dark:text-typography-400",
    bg: isDark ? "bg-background-950" : "bg-white",
    cardBg: isDark ? "bg-background-900" : "bg-background-50",
    tabActive: "bg-emerald-500",
    tabInactive: isDark ? "bg-background-800" : "bg-background-100",
  };

  const renderTabButton = (id: TabType, label: string, Icon: any) => {
    const isActive = activeTab === id;
    return (
      <TouchableOpacity
        onPress={() => setActiveTab(id)}
        style={flattenStyle([
          styles.tabButton,
          isActive ? styles.tabButtonActive : { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" },
        ])}
      >
        <HStack space="xs" className="items-center justify-center">
          <Icon size={14} color={isActive ? "#FFFFFF" : (isDark ? "#9CA3AF" : "#6B7280")} />
          <Text
            style={flattenStyle([
              styles.tabButtonText,
              isActive ? styles.tabButtonTextActive : { color: isDark ? "#9CA3AF" : "#6B7280" },
            ])}
          >
            {label}
          </Text>
        </HStack>
      </TouchableOpacity>
    );
  };

  return (
    <View style={flattenStyle([
      styles.container, 
      { 
        backgroundColor: isDark ? "#111827" : "#FFFFFF",
        top: Dimensions.get("window").height * 0.3
      }
    ])}>
      {/* Header */}
      <HStack style={styles.header}>
        <VStack style={{ flex: 1, alignItems: "center" }}>
          <Heading 
            className="text-2xl font-bold"
            style={{ color: isDark ? "#F9FAFB" : "#111827" }}
          >
            {peak.name}
          </Heading>
          <HStack space="sm" className="items-center mt-1">
            <HStack space="xs" className="items-center">
              <Mountain size={14} color="#10B981" />
              <Text className={`text-sm ${themeClasses.textMuted}`}>
                {peak.heightMoh} {t('common.moh')}
              </Text>
            </HStack>
            <Text className={themeClasses.textMuted}>•</Text>
            <HStack space="xs" className="items-center">
              <MapPin size={14} color="#10B981" />
              <Text className={`text-sm ${themeClasses.textMuted}`}>
                {peak.municipality}, {peak.county}
              </Text>
            </HStack>
          </HStack>
        </VStack>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <X size={24} color={isDark ? "#FFFFFF" : "#111827"} />
        </TouchableOpacity>
      </HStack>

      {/* Main Action Area & Tabs - Tightened Spacing */}
      <VStack className="px-6 pt-2 pb-3" style={{ gap: 4 }}>
        <Button
          onPress={onCheckin}
          disabled={!canCheckin || checkinLoading}
          className="bg-emerald-500 h-12 rounded-xl active:bg-emerald-600 disabled:bg-emerald-500/50"
        >
          <HStack space="sm" className="items-center">
            {checkinLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <CheckCircle size={18} color="#FFFFFF" />
            )}
            <ButtonText className="text-white font-bold text-base">
              {checkinLoading ? t('map.checkin') + "..." : t('map.checkin')}
            </ButtonText>
          </HStack>
        </Button>
        
        <HStack className="justify-center items-center mt-1 mb-2">
           <MapPin size={10} color={isDark ? "#9CA3AF" : "#6B7280"} />
           <Text className={`text-center text-[10px] ml-1 ${themeClasses.textMuted}`}>
            {t('map.yourDistance')}: {distance}
          </Text>
        </HStack>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabContainer}>
          {renderTabButton("info", t('common.info'), Info)}
          {renderTabButton("feed", t('map.tab.feed'), Rss)}
          {renderTabButton("leaderboard", t('map.tab.leaderboard'), Trophy)}
          {renderTabButton("weather", t('weather.weather'), Cloud)}
        </ScrollView>
      </VStack>

      {/* Tab Content */}
      <ScrollView 
        className="flex-1 px-6" 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {activeTab === "info" && (
          <VStack style={{ gap: 16 }}>
            {/* Route Planning Button */}
            <Button
              onPress={showRouteOptions}
              style={flattenStyle([
                { height: 48, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
                isDark ? { backgroundColor: '#1F2937', borderColor: '#374151' } : { backgroundColor: '#F3F4F6' }
              ])}
            >
              <HStack space="sm" className="items-center">
                <Navigation size={18} color="#10B981" />
                <ButtonText 
                  style={{ color: isDark ? '#F9FAFB' : '#111827', fontWeight: 'bold' }}
                >
                  {t('map.createRoute')}
                </ButtonText>
              </HStack>
            </Button>

            {/* Weather Summary Card */}
            <View style={flattenStyle([styles.infoCard, { backgroundColor: isDark ? "#1F2937" : "#F8FAFC" }])}>
              <HStack className="justify-between items-center">
                <HStack space="md" className="items-center">
                  <View style={{ width: 56, height: 58, alignItems: "center", justifyContent: "center", overflow: "visible" }}>
                    <Text style={{ fontSize: 32, lineHeight: 42, includeFontPadding: true, textAlign: 'center' }}>{weatherData?.symbol || "☁️"}</Text>
                  </View>
                  <VStack>
                    <Text 
                      className="font-semibold"
                      style={{ color: isDark ? "#F9FAFB" : "#111827" }}
                    >
                      {t('weather.now')}
                    </Text>
                    <Text size="xs" className={themeClasses.textMuted}>{weatherData?.description || t('common.loading') + "..."}</Text>
                  </VStack>
                </HStack>
                <HStack space="sm" className="items-center">
                  <Text 
                    className="text-2xl font-bold"
                    style={{ color: isDark ? "#F9FAFB" : "#111827" }}
                  >
                    {weatherData ? `${weatherData.temp}°` : "--"}
                  </Text>
                  <VStack className="items-end ml-1">
                    <Wind size={14} color={isDark ? "#9CA3AF" : "#64748B"} />
                    <Text style={{ fontSize: 10 }} className={themeClasses.textMuted}>
                      {weatherData ? `${weatherData.wind} m/s` : "--"}
                    </Text>
                  </VStack>
                </HStack>
              </HStack>
            </View>

            {/* Astronomy Cards */}
            <HStack space="md">
              <View 
                style={flattenStyle([
                  styles.astroCard, 
                  { flex: 1, backgroundColor: isDark ? "#1F2937" : "#FEFCE8" }
                ])}
              >
                <Sun size={20} color="#EAB308" />
                <VStack>
                  <Text style={{ fontSize: 10 }} className="text-yellow-700 dark:text-yellow-500 font-bold uppercase tracking-wider">{t('weather.sunrise')}</Text>
                  <Text 
                    className="text-xl font-bold"
                    style={{ color: isDark ? "#F9FAFB" : "#111827" }}
                  >
                    {astronomy?.sunrise || "--:--"}
                  </Text>
                </VStack>
              </View>
              <View 
                style={flattenStyle([
                  styles.astroCard, 
                  { flex: 1, backgroundColor: isDark ? "#1F2937" : "#EFF6FF" }
                ])}
              >
                <Moon size={20} color="#3B82F6" />
                <VStack>
                  <Text style={{ fontSize: 10 }} className="text-blue-700 dark:text-blue-500 font-bold uppercase tracking-wider">{t('weather.sunset')}</Text>
                  <Text 
                    className="text-xl font-bold"
                    style={{ color: isDark ? "#F9FAFB" : "#111827" }}
                  >
                    {astronomy?.sunset || "--:--"}
                  </Text>
                </VStack>
              </View>
            </HStack>

            {/* Description */}
            <VStack space="xs" className="mt-2">
              <Heading 
                size="xs" 
                className="uppercase tracking-widest font-bold"
                style={{ color: isDark ? "#F9FAFB" : "#6B7280" }}
              >
                {t('workout.notes')}
              </Heading>
              <Text className={`text-sm leading-relaxed ${themeClasses.textMuted}`}>
                {peak.description || t('map.noDescription')}
              </Text>
            </VStack>
          </VStack>
        )}

        {activeTab === "feed" && (
          <PeakSpecificFeed peakId={peak.id} />
        )}

        {activeTab === "leaderboard" && (
          <PeakLeaderboard peakId={peak.id} />
        )}

        {activeTab === "weather" && (
          <WeatherTab 
            latitude={peak.latitude} 
            longitude={peak.longitude} 
            astronomy={astronomy}
            weatherData={fullForecast}
            dailyInfo={dailyInfo}
          />
        )}
      </ScrollView>
    </View>
  );
}

// Sub-component for peak specific feed
function PeakSpecificFeed({ peakId }: { peakId: string }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { t } = useLanguage();
  const [feed, setFeed] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeed = async () => {
      setLoading(true);
      try {
        // Fetch check-ins first
        const { data: checkins, error } = await supabase
          .from("peak_checkins")
          .select("*")
          .eq("peak_id", peakId)
          .order("checked_in_at", { ascending: false })
          .limit(20);

        if (error) throw error;
        
        if (!checkins || checkins.length === 0) {
          setFeed([]);
          return;
        }

        // Collect unique user IDs
        const userIds = [...new Set(checkins.map(c => c.user_id))];

        // Fetch profiles and child profiles separately
        const [profilesRes, childrenRes] = await Promise.all([
          supabase.from("profiles").select("id, username, avatar_url").in("id", userIds),
          supabase.from("child_profiles").select("id, name, avatar_url, emoji").in("id", userIds)
        ]);

        const profileMap = new Map(profilesRes.data?.map(p => [p.id, p]) || []);
        const childMap = new Map(childrenRes.data?.map(c => [c.id, c]) || []);

        // Merge data
        const enrichedCheckins = checkins.map(item => ({
          ...item,
          profiles: profileMap.get(item.user_id),
          child_profiles: childMap.get(item.user_id)
        }));

        setFeed(enrichedCheckins);
      } catch (err) {
        console.error("Failed to fetch peak specific feed", err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeed();
  }, [peakId]);

  if (loading) {
    return (
      <View className="py-20">
        <ActivityIndicator color="#10B981" />
      </View>
    );
  }

  if (feed.length === 0) {
    return (
      <View className="py-20 items-center justify-center">
        <Rss size={48} color={isDark ? "#374151" : "#E2E8F0"} />
        <Text className="text-typography-500 dark:text-typography-400 mt-4 text-center">
          {t('peakFeed.noCheckins')}{"\n"}{t('peakFeed.beFirst')}
        </Text>
      </View>
    );
  }

  return (
    <VStack style={{ gap: 16 }}>
      {feed.map((item) => {
        const profile = item.profiles;
        const child = item.child_profiles;
        const username = profile?.username || child?.name || t('peak.hiker');
        const avatarUrl = profile?.avatar_url || child?.avatar_url;
        const emoji = child?.emoji;
        
        return (
          <View 
            key={item.id} 
            style={flattenStyle([
              styles.feedCard, 
              { backgroundColor: isDark ? "#1F2937" : "#FFFFFF", borderColor: isDark ? "#374151" : "#E5E7EB" }
            ])}
          >
            <HStack space="md" className="items-center mb-3">
              <View className="w-10 h-10 rounded-full overflow-hidden bg-background-200 dark:bg-background-800">
                {avatarUrl ? (
                  <ExpoImage 
                    source={{ uri: avatarUrl }} 
                    style={{ width: '100%', height: '100%' }} 
                    contentFit="cover"
                  />
                ) : (
                  <View className="w-full h-full items-center justify-center">
                    <Text>{emoji || "🏔️"}</Text>
                  </View>
                )}
              </View>
              <VStack>
                <Text 
                  className="font-bold"
                  style={{ color: isDark ? "#F9FAFB" : "#111827" }}
                >
                  {username}
                </Text>
                <Text size="xs" className="text-typography-500 dark:text-typography-400">
                  {(() => {
                    const d = new Date(item.checked_in_at);
                    return `${d.getDate()}. ${t("month.short." + d.getMonth()).toLowerCase()}. ${d.getFullYear()}`;
                  })()}
                </Text>
              </VStack>
            </HStack>
            {item.image_url && (
              <ExpoImage 
                source={{ uri: item.image_url }} 
                style={styles.feedImage} 
                contentFit="cover"
                className="mb-3"
              />
            )}
          </View>
        );
      })}
    </VStack>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    zIndex: 100,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 20,
  },
  header: {
    paddingTop: 20,
    paddingHorizontal: 24,
    paddingBottom: 8,
    alignItems: "flex-start",
  },
  closeBtn: {
    position: "absolute",
    right: 20,
    top: 20,
    zIndex: 10,
    padding: 4,
  },
  tabContainer: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 4,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    minWidth: 80,
  },
  tabButtonActive: {
    backgroundColor: "#10B981",
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: "600",
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },
  infoCard: {
    padding: 20,
    borderRadius: 24,
  },
  astroCard: {
    padding: 16,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  feedCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  feedImage: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
});
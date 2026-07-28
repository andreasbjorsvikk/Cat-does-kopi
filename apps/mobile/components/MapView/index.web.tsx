import React, { useEffect, useState } from "react";
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity, 
  Image,
  ScrollView,
  StyleSheet as RNStyleSheet
} from "react-native";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Card } from "@/components/ui/card";
import { HStack } from "@/components/ui/hstack";
import { VStack } from "@/components/ui/vstack";
import { 
  MapPin, 
  X, 
  CheckCircle, 
  Map as MapIcon, 
  Globe
} from "lucide-react-native";
import { fetchPeaks, Peak } from "@/services/peakDbService";
import useColorScheme from "@/hooks/useColorScheme";

export default function MapScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [loading, setLoading] = useState(true);
  const [peaks, setPeaks] = useState<Peak[]>([]);
  const [selectedPeak, setSelectedPeak] = useState<Peak | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPeaks = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPeaks();
      setPeaks(data);
    } catch (err) {
      console.error("Error fetching peaks in MapScreen Web", err);
      setError("Kunne ikke laste toppturer.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPeaks();
  }, []);

  const themeClasses = {
    bg: isDark ? "bg-background-950" : "bg-background-0",
    text: isDark ? "text-typography-50" : "text-typography-950",
    textMuted: isDark ? "text-typography-400" : "text-typography-500",
    cardBg: isDark ? "bg-background-900 border-outline-800" : "bg-background-0 border-outline-100",
  };

  const handlePeakSelect = (peak: Peak) => {
    setSelectedPeak(peak);
  };

  if (loading) {
    return (
      <View style={[styles.centered, isDark ? styles.bgDark : styles.bgLight]}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const containerStyle = RNStyleSheet.flatten([styles.container, isDark ? styles.bgDark : styles.bgLight]);

  return (
    <View style={containerStyle}>
      {error && (
        <Card className="m-4 p-4 border-red-500 bg-red-50" style={{ zIndex: 10 }}>
          <VStack style={{ alignItems: 'center', gap: 8 }}>
            <Text className="text-red-600 font-bold text-center">{error}</Text>
            <TouchableOpacity 
              onPress={() => loadPeaks()}
              style={{ backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text className="text-white font-bold">Prøv igjen</Text>
            </TouchableOpacity>
          </VStack>
        </Card>
      )}
      <View style={styles.webHeader}>
        <HStack style={styles.webHeaderRow}>
          <View style={styles.headerIconContainer}>
            <MapIcon size={22} color="#10B981" />
          </View>
          <VStack>
            <Heading className={`text-xl font-extrabold ${themeClasses.text}`}>Toppturer & Kart</Heading>
            <Text className={`text-xs ${themeClasses.textMuted}`}>Utforsk {peaks.length} fantastiske topper i Norge</Text>
          </VStack>
        </HStack>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.webContentContainer}>
        <View style={RNStyleSheet.flatten([styles.webMapPlaceholder, { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" }])}>
          <Globe size={48} color="#10B981" style={{ marginBottom: 12 }} />
          <Text className={`font-bold text-center text-lg ${themeClasses.text}`}>Interaktivt Kart</Text>
          <Text className={`text-center max-w-md px-6 text-sm mt-1 ${themeClasses.textMuted}`}>
            Nativt kart er fullt integrert på iOS og Android! Her ser du listen over tilgjengelige topper i databasen:
          </Text>
        </View>

        <Heading className={`text-lg font-bold mb-3 mt-6 px-4 ${themeClasses.text}`}>
          Topper i nærheten
        </Heading>
        <VStack style={styles.webList} className="px-4">
          {peaks.map((peak) => (
            <TouchableOpacity 
              key={peak.id}
              onPress={() => handlePeakSelect(peak)}
              activeOpacity={0.9}
            >
              <Card 
                className={`p-4 mb-3 ${themeClasses.cardBg} ${selectedPeak?.id === peak.id ? "border-2 border-emerald-500" : "border"}`}
                style={styles.webPeakCard}
              >
                <HStack style={{ alignItems: "center" }}>
                  <Image 
                    source={{ uri: peak.imageUrl || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" }} 
                    style={styles.peakThumb} 
                  />
                  <VStack style={{ flex: 1, marginLeft: 12 }}>
                    <Text className={`font-bold ${themeClasses.text}`}>{peak.name}</Text>
                    <Text className={`text-xs ${themeClasses.textMuted}`}>{peak.heightMoh} moh • {peak.municipality}, {peak.county}</Text>
                  </VStack>
                  <MapPin size={18} color="#10B981" />
                </HStack>
              </Card>
            </TouchableOpacity>
          ))}
        </VStack>
      </ScrollView>

      {selectedPeak && (
        <View style={RNStyleSheet.flatten([styles.bottomSheet, { backgroundColor: isDark ? "#111827" : "#FFFFFF" }])}>
          <HStack style={styles.sheetHeader}>
            <VStack style={{ flex: 1 }}>
              <Heading className={`text-xl font-bold ${themeClasses.text}`}>{selectedPeak.name}</Heading>
              <Text className={`text-xs ${themeClasses.textMuted}`}>{selectedPeak.heightMoh} moh • {selectedPeak.municipality}, {selectedPeak.county}</Text>
            </VStack>
            <TouchableOpacity onPress={() => setSelectedPeak(null)} style={styles.closeBtn}>
              <X size={20} color={isDark ? "#FFFFFF" : "#000000"} />
            </TouchableOpacity>
          </HStack>
          <Image 
            source={{ uri: selectedPeak.imageUrl || "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b" }} 
            style={styles.sheetImage} 
          />
          <Text className={`text-sm mt-3 ${themeClasses.textMuted}`} style={{ paddingBottom: 16 }}>
            {selectedPeak.description}
          </Text>
          <TouchableOpacity style={styles.checkinBtn} activeOpacity={0.8}>
            <HStack style={styles.checkinBtnContent}>
              <CheckCircle size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.checkinBtnText}>Registrer innsjekk her</Text>
            </HStack>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgLight: { backgroundColor: "#F9FAFB" },
  bgDark: { backgroundColor: "#030712" },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  webHeader: { paddingTop: 60, paddingHorizontal: 16, paddingBottom: 16 },
  webHeaderRow: { alignItems: "center" },
  headerIconContainer: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: "#10B98115",
    alignItems: "center", justifyContent: "center", marginRight: 12,
  },
  webContentContainer: { paddingBottom: 40 },
  webMapPlaceholder: {
    height: 220, marginHorizontal: 16, borderRadius: 20, justifyContent: "center",
    alignItems: "center", borderWidth: 1, borderColor: "#E5E7EB", borderStyle: "dashed", padding: 20,
  },
  webList: { gap: 8 },
  webPeakCard: { borderRadius: 16 },
  peakThumb: { width: 48, height: 48, borderRadius: 12 },
  bottomSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 40, shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, zIndex: 20,
  },
  sheetHeader: { alignItems: "flex-start", marginBottom: 16 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F3F4F620", alignItems: "center", justifyContent: "center" },
  sheetImage: { width: "100%", height: 160, borderRadius: 16 },
  checkinBtn: { backgroundColor: "#10B981", height: 50, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  checkinBtnContent: { alignItems: "center", justifyContent: "center" },
  checkinBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
});
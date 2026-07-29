import React, { useMemo, useState } from "react";
import { 
  View, 
  FlatList, 
  TouchableOpacity, 
  StyleSheet, 
  Platform,
  ActivityIndicator
} from "react-native";
import { Peak } from "@/services/peakDbService";
import { PeakCheckin, getDistanceMeters } from "@/services/peakCheckinService";
import { hapticsService } from "@/services/hapticsService";
import { 
  Search, 
  SlidersHorizontal, 
  Mountain, 
  ChevronRight,
  Map as MapIcon
} from "lucide-react-native";
import { Text } from "@/components/ui/text";
import { Heading } from "@/components/ui/heading";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { LinearGradient } from "expo-linear-gradient";
import useColorScheme from "@/hooks/useColorScheme";
import { PeaksFilter, PeaksFilterSheet } from "./PeaksFilterSheet";
import { getPeakColor } from "@/utils/peakIcons";
import { flattenStyle } from "@/utils/flatten-style";

interface PeaksListProps {
  peaks: Peak[];
  checkins: PeakCheckin[];
  userLocation: { latitude: number; longitude: number } | null;
  onSelectPeak: (peak: Peak) => void;
  loading?: boolean;
}

type StatusFilter = "all" | "reached" | "not_reached";

export const PeaksList = ({ peaks, checkins, userLocation, onSelectPeak, loading }: PeaksListProps) => {
  const isDark = useColorScheme() === "dark";
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilterSheet, setShowFiltersSheet] = useState(false);
  const [activeFilters, setActiveFilters] = useState<PeaksFilter>({
    heightRange: [0, 2500],
    selectedCounty: null,
    selectedMunicipality: null,
  });

  const checkedPeakIds = useMemo(() => new Set(checkins.map(c => c.peak_id)), [checkins]);

  const uniqueCounties = useMemo(() => {
    const counties = new Set(peaks.map(p => p.county).filter(Boolean));
    return Array.from(counties) as string[];
  }, [peaks]);

  const peaksWithDistance = useMemo(() => {
    return peaks.map(p => ({
      ...p,
      distance: userLocation
        ? getDistanceMeters(userLocation.latitude, userLocation.longitude, p.latitude, p.longitude)
        : null,
    }));
  }, [peaks, userLocation]);

  const filteredPeaks = useMemo(() => {
    let result = peaksWithDistance.filter(p => {
      // Status filter
      if (statusFilter === "reached") return checkedPeakIds.has(p.id);
      if (statusFilter === "not_reached") return !checkedPeakIds.has(p.id);
      return true;
    });

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q));
    }

    // Advanced filters
    result = result.filter(p => 
      p.heightMoh >= activeFilters.heightRange[0] && 
      p.heightMoh <= activeFilters.heightRange[1]
    );

    if (activeFilters.selectedCounty) {
      result = result.filter(p => p.county === activeFilters.selectedCounty);
    }
    if (activeFilters.selectedMunicipality) {
      result = result.filter(p => p.municipality === activeFilters.selectedMunicipality);
    }

    // Sort by distance
    result.sort((a, b) => {
      if (a.distance !== null && b.distance !== null) return a.distance - b.distance;
      if (a.distance !== null) return -1;
      if (b.distance !== null) return 1;
      return a.name.localeCompare(b.name);
    });

    return result;
  }, [peaksWithDistance, statusFilter, searchQuery, activeFilters, checkedPeakIds]);

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${Math.round(meters)} m`;
    const km = meters / 1000;
    return `${km.toFixed(1).replace(".", ",")} km`;
  };

  const hasActiveAdvancedFilters = 
    activeFilters.heightRange[0] > 0 || 
    activeFilters.heightRange[1] < 2500 ||
    activeFilters.selectedCounty !== null || 
    activeFilters.selectedMunicipality !== null;

  const renderItem = ({ item }: { item: typeof peaksWithDistance[0] }) => {
    const isReached = checkedPeakIds.has(item.id);
    
    return (
      <TouchableOpacity 
        onPress={() => {
          hapticsService.impact("light");
          onSelectPeak(item);
        }}
        activeOpacity={0.7}
        className="flex-row items-center p-4 border-b border-outline-50 dark:border-outline-800"
        style={{ backgroundColor: isDark ? "#030712" : "#FFFFFF" }}
      >
        <View className="relative">
          <LinearGradient
            colors={isReached 
              ? ["#10B981", "#059669"] 
              : (isDark ? ["#525252", "#404040"] : ["#9CA3AF", "#6B7280"])
            }
            style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
          >
            <Mountain size={22} color="#FFFFFF" strokeWidth={2} />
          </LinearGradient>
          {isReached && (
            <View 
              className="absolute -right-1 -bottom-1 bg-white dark:bg-background-950 rounded-full p-0.5 border border-emerald-500 shadow-sm"
            >
              <View className="bg-emerald-500 rounded-full w-3.5 h-3.5 items-center justify-center">
                <Text className="text-[8px] text-white font-bold">✓</Text>
              </View>
            </View>
          )}
        </View>
        
        <VStack className="flex-1 ml-3" style={{ gap: 1 }}>
          <Text className="font-semibold text-sm text-typography-900 dark:text-white">
            {item.name}
          </Text>
          <Text size="xs" className="text-typography-500 dark:text-typography-400">
            {item.heightMoh} moh · {item.municipality}, {item.county}
          </Text>
          {item.distance !== null && (
            <Text size="xs" className="text-emerald-600 dark:text-emerald-400 font-medium">
              {formatDistance(item.distance)} unna
            </Text>
          )}
        </VStack>
        
        <ChevronRight size={18} color={isDark ? "#4B5563" : "#D1D5DB"} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={flattenStyle([styles.container, { backgroundColor: isDark ? "#030712" : "#F9FAFB" }])}>
      <VStack 
        className="border-b border-outline-100 dark:border-outline-800 pt-2 shadow-sm z-10"
        style={{ backgroundColor: isDark ? "#030712" : "#FFFFFF" }}
      >
        {/* Search and Filter Trigger */}
        <HStack className="px-4 py-2" style={{ gap: 10 }}>
          <Input 
            variant="outline" 
            size="md" 
            className="flex-1 rounded-xl border-none"
            style={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6" }}
          >
            <InputSlot className="pl-3">
              <Search size={18} color={isDark ? "#9CA3AF" : "#6B7280"} />
            </InputSlot>
            <InputField
              placeholder="Søk etter topper..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              className={isDark ? "text-typography-50" : "text-typography-950"}
              placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
            />
          </Input>
          
          <TouchableOpacity 
            onPress={() => {
              hapticsService.impact("light");
              setShowFiltersSheet(true);
            }}
            className={`w-11 h-11 items-center justify-center rounded-xl border ${
              hasActiveAdvancedFilters 
                ? "bg-emerald-500 border-emerald-500" 
                : "border-outline-100 dark:border-outline-800"
            }`}
            style={!hasActiveAdvancedFilters ? { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" } : undefined}
          >
            <SlidersHorizontal 
              size={20} 
              color={hasActiveAdvancedFilters ? "#FFFFFF" : (isDark ? "#9CA3AF" : "#4B5563")} 
            />
          </TouchableOpacity>
        </HStack>

        {/* Status Filter Pills */}
        <HStack style={{ gap: 8 }} className="px-4 py-3">
          {[
            { id: "all", label: "Alle" },
            { id: "reached", label: "Nådd" },
            { id: "not_reached", label: "Ikke nådd" }
          ].map((f) => {
            const isSelected = statusFilter === f.id;
            return (
              <TouchableOpacity
                key={f.id}
                onPress={() => {
                  hapticsService.impact("light");
                  setStatusFilter(f.id as StatusFilter);
                }}
                className={`px-4 py-1.5 rounded-full border ${
                  isSelected 
                    ? "bg-emerald-500 border-emerald-500" 
                    : "border-outline-100 dark:border-outline-800"
                }`}
                style={!isSelected ? { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" } : undefined}
              >
                <Text 
                  size="xs" 
                  className={`font-semibold ${isSelected ? "text-white" : "text-typography-600 dark:text-typography-400"}`}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
          <View className="flex-1" />
          <Text size="xs" className="text-typography-400 dark:text-typography-500 self-center">
            {filteredPeaks.length} topper
          </Text>
        </HStack>
      </VStack>

      <View style={{ flex: 1 }}>
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#10B981" />
            <Text className="mt-4 text-typography-500 dark:text-typography-400">Laster fjelltopper...</Text>
          </View>
        ) : (
          <FlatList
            data={filteredPeaks}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <VStack className="items-center justify-center py-20 px-10">
                <Mountain size={48} color={isDark ? "#374151" : "#E5E7EB"} />
                <Heading size="sm" className="mt-4 text-center dark:text-typography-50">Ingen topper funnet</Heading>
                <Text size="sm" className="text-center text-typography-500 dark:text-typography-400 mt-2">
                  Prøv å endre søket eller filtrene dine.
                </Text>
              </VStack>
            }
          />
        )}
      </View>

      <PeaksFilterSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFiltersSheet(false)}
        filter={activeFilters}
        onFilterChange={setActiveFilters}
        userLocation={userLocation}
        uniqueCounties={uniqueCounties}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Platform.OS === 'web' ? 'transparent' : 'transparent',
  },
});
import React, { useMemo, useState, useEffect } from "react";
import { Platform, ScrollView, TouchableOpacity, View, StyleSheet, Dimensions } from "react-native";
import {
  Actionsheet,
  ActionsheetBackdrop,
  ActionsheetContent,
  ActionsheetDragIndicator,
  ActionsheetDragIndicatorWrapper,
} from "@/components/ui/actionsheet";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button, ButtonText } from "@/components/ui/button";
import MultiSlider from "@ptomasroos/react-native-multi-slider";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Search, X } from "lucide-react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import useColorScheme from "@/hooks/useColorScheme";
import { sortCountiesByProximity } from "@/utils/norwegianCounties";
import kommunerData from "@/data/kommuner.json";
import { hapticsService } from "@/services/hapticsService";
import { useLanguage } from "@/context/LanguageContext";

export interface PeaksFilter {
  heightRange: [number, number];
  selectedCounty: string | null;
  selectedMunicipality: string | null;
}

interface PeaksFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filter: PeaksFilter;
  onFilterChange: (filter: PeaksFilter) => void;
  userLocation: { latitude: number; longitude: number } | null;
  uniqueCounties: string[];
}

export const PeaksFilterSheet = ({
  isOpen,
  onClose,
  filter,
  onFilterChange,
  userLocation,
  uniqueCounties,
}: PeaksFilterSheetProps) => {
  const isDark = useColorScheme() === "dark";
  const { t } = useLanguage();
  const [localHeightRange, setLocalHeightRange] = useState<[number, number]>(filter.heightRange);
  const [municipalitySearch, setMunicipalitySearch] = useState("");

  // Sync local state when filter prop changes (e.g. on reset)
  useEffect(() => {
    setLocalHeightRange(filter.heightRange);
  }, [filter.heightRange]);

  const sortedCounties = useMemo(() => {
    if (userLocation) {
      return sortCountiesByProximity(
        uniqueCounties,
        userLocation.latitude,
        userLocation.longitude
      );
    }
    return [...uniqueCounties].sort();
  }, [uniqueCounties, userLocation]);

  const municipalitiesInCounty = useMemo(() => {
    if (!filter.selectedCounty) return [];
    // Get all municipalities from the data that belong to the selected county
    const inCounty = (kommunerData as any[]).filter(
      (k) => k.fylke === filter.selectedCounty
    );
    return inCounty.map((k) => k.name).sort();
  }, [filter.selectedCounty]);

  const filteredMunicipalities = useMemo(() => {
    if (!municipalitySearch.trim()) return municipalitiesInCounty.slice(0, 15);
    return municipalitiesInCounty.filter((m) =>
      m.toLowerCase().includes(municipalitySearch.toLowerCase())
    );
  }, [municipalitiesInCounty, municipalitySearch]);

  const handleReset = () => {
    hapticsService.impact("medium");
    onFilterChange({
      heightRange: [0, 2500],
      selectedCounty: null,
      selectedMunicipality: null,
    });
    setLocalHeightRange([0, 2500]);
    setMunicipalitySearch("");
  };

  const hasActiveFilters = 
    filter.heightRange[0] > 0 || 
    filter.heightRange[1] < 2500 ||
    filter.selectedCounty !== null || 
    filter.selectedMunicipality !== null;

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} useRNModal={Platform.OS !== "web"}>
      <ActionsheetBackdrop />
      <ActionsheetContent className="bg-background-0 dark:bg-background-950">
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        
        <VStack 
          className="w-full px-4 pt-2 pb-8 bg-background-0 dark:bg-background-950" 
          style={{ gap: 24 }}
        >
          <HStack className="justify-between items-center">
            <Heading size="md" className={isDark ? "text-typography-50" : "text-typography-950"}>
              {t('peaksList.filterTitle')}
            </Heading>
            {hasActiveFilters && (
              <TouchableOpacity onPress={handleReset}>
                <Text size="sm" className="text-error-500 font-medium">{t('common.reset')}</Text>
              </TouchableOpacity>
            )}
          </HStack>

          {/* Height Slider */}
          <VStack style={{ gap: 12 }}>
            <HStack className="justify-between">
              <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700 font-medium"}>
                {t('peaksList.elevation')}
              </Text>
              <Text size="sm" className="text-emerald-500 font-bold">
                {localHeightRange[0]}–{localHeightRange[1]} {t('common.moh')}
              </Text>
            </HStack>
            <View className="items-center w-full px-2">
              <MultiSlider
                values={localHeightRange}
                sliderLength={Dimensions.get('window').width - 80}
                onValuesChange={(values) => setLocalHeightRange([values[0], values[1]])}
                onValuesChangeFinish={(values) => {
                  onFilterChange({ ...filter, heightRange: [values[0], values[1]] });
                }}
                min={0}
                max={2500}
                step={50}
                allowOverlap={false}
                snapped
                selectedStyle={{ backgroundColor: "#10B981" }}
                unselectedStyle={{ backgroundColor: isDark ? "#374151" : "#E5E7EB" }}
                trackStyle={{ height: 4, borderRadius: 2 }}
                markerStyle={{
                  height: 24,
                  width: 24,
                  borderRadius: 12,
                  backgroundColor: isDark ? "#E5E7EB" : "#FFFFFF",
                  borderWidth: 2,
                  borderColor: "#10B981",
                  marginTop: 2,
                  elevation: 3,
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                }}
              />
            </View>
          </VStack>

          {/* County Selector */}
          <VStack style={{ gap: 12 }}>
            <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700 font-medium"}>
              {t('common.county')}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 px-4">
              <HStack style={{ gap: 8 }}>
                {sortedCounties.map((county) => {
                  const isSelected = filter.selectedCounty === county;
                  return (
                    <TouchableOpacity
                      key={county}
                      onPress={() => {
                        hapticsService.impact("light");
                        onFilterChange({
                          ...filter,
                          selectedCounty: isSelected ? null : county,
                          selectedMunicipality: null,
                        });
                        setMunicipalitySearch("");
                      }}
                      className={`px-4 py-2 rounded-full border ${
                        isSelected
                          ? "bg-emerald-500 border-emerald-500"
                          : isDark ? "border-outline-800" : "border-outline-200"
                      }`}
                      style={!isSelected ? { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" } : undefined}
                    >
                      <Text
                        size="xs"
                        className={`font-semibold ${
                          isSelected ? "text-white" : isDark ? "text-typography-300" : "text-typography-700"
                        }`}
                      >
                        {county}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </HStack>
            </ScrollView>
          </VStack>

          {/* Municipality Selector */}
          {filter.selectedCounty && (
            <VStack style={{ gap: 12 }}>
              <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700 font-medium"}>
                {t('peaksList.municipality')} {t('report.of').toLowerCase()} {filter.selectedCounty}
              </Text>
              
              {filter.selectedMunicipality ? (
                <HStack>
                  <Badge action="success" variant="solid" className="bg-emerald-500/10 dark:bg-emerald-500/20 px-3 py-1.5 rounded-lg border border-emerald-500/30 dark:border-emerald-500/40">
                    <Text size="sm" className="text-emerald-700 dark:text-emerald-400 font-medium mr-2">
                      {filter.selectedMunicipality}
                    </Text>
                    <TouchableOpacity onPress={() => onFilterChange({ ...filter, selectedMunicipality: null })}>
                      <X size={14} color={isDark ? "#34D399" : "#047857"} />
                    </TouchableOpacity>
                  </Badge>
                </HStack>
              ) : (
                <>
                  <Input 
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl border-outline-200 dark:border-outline-800"
                    style={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6" }}
                  >
                    <InputSlot className="pl-3">
                      <Search size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                    </InputSlot>
                    <InputField
                      placeholder={t('peaksList.searchMunicipality')}
                      value={municipalitySearch}
                      onChangeText={setMunicipalitySearch}
                      className={isDark ? "text-typography-50" : "text-typography-950"}
                      placeholderTextColor={isDark ? "#9CA3AF" : "#6B7280"}
                    />
                  </Input>
                  
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {filteredMunicipalities.map((municipality) => (
                      <TouchableOpacity
                        key={municipality}
                        onPress={() => {
                          hapticsService.impact("light");
                          onFilterChange({
                            ...filter,
                            selectedMunicipality: municipality,
                          });
                          setMunicipalitySearch("");
                        }}
                        className={`px-3 py-1.5 rounded-lg border ${
                          isDark ? "border-outline-800" : "border-outline-100"
                        }`}
                        style={{ backgroundColor: isDark ? "#1F2937" : "#F3F4F6" }}
                      >
                        <Text size="xs" className={isDark ? "text-typography-300" : "text-typography-600"}>
                          {municipality}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {municipalitiesInCounty.length > 15 && !municipalitySearch && (
                      <Text size="xs" className="italic text-typography-500 dark:text-typography-400 py-1">
                        {t('peaksList.searchMunicipality')}
                      </Text>
                    )}
                  </View>
                </>
              )}
            </VStack>
          )}

          <Button 
            className="w-full bg-emerald-500 data-[hover=true]:bg-emerald-600 data-[active=true]:bg-emerald-700 h-12 rounded-xl"
            onPress={onClose}
          >
            <ButtonText>{t('common.showResults')}</ButtonText>
          </Button>
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};
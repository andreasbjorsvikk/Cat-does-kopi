import React, { useMemo, useState, useEffect } from "react";
import { Platform, ScrollView, TouchableOpacity, View, StyleSheet } from "react-native";
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
import { Slider, SliderFilledTrack, SliderThumb, SliderTrack } from "@/components/ui/slider";
import { Input, InputField, InputIcon, InputSlot } from "@/components/ui/input";
import { Search, X } from "lucide-react-native";
import { Badge, BadgeText } from "@/components/ui/badge";
import useColorScheme from "@/hooks/useColorScheme";
import { sortCountiesByProximity } from "@/utils/norwegianCounties";
import kommunerData from "@/data/kommuner.json";
import { hapticsService } from "@/services/hapticsService";

export interface PeaksFilter {
  minHeight: number;
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
  const [municipalitySearch, setMunicipalitySearch] = useState("");

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
      minHeight: 0,
      selectedCounty: null,
      selectedMunicipality: null,
    });
    setMunicipalitySearch("");
  };

  const hasActiveFilters = 
    filter.minHeight > 0 || 
    filter.selectedCounty !== null || 
    filter.selectedMunicipality !== null;

  return (
    <Actionsheet isOpen={isOpen} onClose={onClose} useRNModal={Platform.OS !== "web"}>
      <ActionsheetBackdrop />
      <ActionsheetContent className={isDark ? "bg-background-900" : "bg-background-0"}>
        <ActionsheetDragIndicatorWrapper>
          <ActionsheetDragIndicator />
        </ActionsheetDragIndicatorWrapper>
        
        <VStack className="w-full px-4 pt-2 pb-8" style={{ gap: 24 }}>
          <HStack className="justify-between items-center">
            <Heading size="md" className={isDark ? "text-typography-50" : "text-typography-950"}>
              Filtrer topper
            </Heading>
            {hasActiveFilters && (
              <TouchableOpacity onPress={handleReset}>
                <Text size="sm" className="text-error-500 font-medium">Nullstill</Text>
              </TouchableOpacity>
            )}
          </HStack>

          {/* Height Slider */}
          <VStack style={{ gap: 12 }}>
            <HStack className="justify-between">
              <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700 font-medium"}>
                Minimum høyde
              </Text>
              <Text size="sm" className="text-emerald-500 font-bold">
                {filter.minHeight} moh
              </Text>
            </HStack>
            <Slider
              value={filter.minHeight}
              minValue={0}
              maxValue={2500}
              step={50}
              onChange={(val) => {
                onFilterChange({ ...filter, minHeight: val });
              }}
              size="md"
            >
              <SliderTrack>
                <SliderFilledTrack className="bg-emerald-500" />
              </SliderTrack>
              <SliderThumb className="bg-emerald-500 border-2 border-white" />
            </Slider>
          </VStack>

          {/* County Selector */}
          <VStack style={{ gap: 12 }}>
            <Text size="sm" className={isDark ? "text-typography-300" : "text-typography-700 font-medium"}>
              Fylke
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
                          : isDark
                          ? "bg-background-800 border-outline-800"
                          : "bg-background-50 border-outline-200"
                      }`}
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
                Kommune i {filter.selectedCounty}
              </Text>
              
              {filter.selectedMunicipality ? (
                <HStack>
                  <Badge action="success" variant="solid" className="bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
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
                  <Input variant="outline" size="sm" className="rounded-xl bg-background-50 dark:bg-background-800 border-outline-200 dark:border-outline-800">
                    <InputSlot className="pl-3">
                      <Search size={16} color={isDark ? "#9CA3AF" : "#6B7280"} />
                    </InputSlot>
                    <InputField
                      placeholder="Søk i kommuner..."
                      value={municipalitySearch}
                      onChangeText={setMunicipalitySearch}
                      className={isDark ? "text-typography-50" : "text-typography-950"}
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
                          isDark
                            ? "bg-background-800 border-outline-800"
                            : "bg-background-50 border-outline-100"
                        }`}
                      >
                        <Text size="xs" className={isDark ? "text-typography-300" : "text-typography-600"}>
                          {municipality}
                        </Text>
                      </TouchableOpacity>
                    ))}
                    {municipalitiesInCounty.length > 15 && !municipalitySearch && (
                      <Text size="xs" className="italic text-typography-500 py-1">
                        Søk for å finne flere...
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
            <ButtonText>Vis resultater</ButtonText>
          </Button>
        </VStack>
      </ActionsheetContent>
    </Actionsheet>
  );
};
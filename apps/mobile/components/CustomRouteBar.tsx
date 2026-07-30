import React from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { X, Navigation, Trash2, MapPin, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useRoute } from '@/context/RouteContext';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';

export function CustomRouteBar() {
  const { activeRoute, progress, clearRoute, toggleRoundTrip, removeWaypoint, setIsPickingWaypoint } = useRoute();
  const isDark = useColorScheme() === 'dark';
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (!activeRoute) return null;

  const totalDist = activeRoute.isRoundTrip ? activeRoute.summary.distance * 2 : activeRoute.summary.distance;
  const totalGain = activeRoute.isRoundTrip ? activeRoute.summary.elevGain + activeRoute.summary.elevLoss : activeRoute.summary.elevGain;

  const coveredDist = progress?.coveredDistance || 0;
  const coveredGain = progress?.coveredGain || 0;

  const remainingDist = Math.max(0, totalDist - coveredDist);
  const remainingGain = Math.max(0, totalGain - coveredGain);

  const formatDist = (m: number) => (m / 1000).toFixed(1) + ' km';
  const formatElev = (m: number) => Math.round(m) + ' m';

  return (
    <View style={flattenStyle([
      styles.container,
      { backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)' }
    ])}>
      <VStack space="xs">
        {/* Progress Summary */}
        <HStack className="justify-between items-center px-4 py-2">
          <VStack>
            <HStack space="xs" className="items-center">
              <Navigation size={14} color="#10B981" />
              <Text className="font-bold text-sm" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
                {formatDist(coveredDist)} / {formatDist(totalDist)}
              </Text>
            </HStack>
            <Text size="xs" className="text-typography-500">
              Gjenværende: {formatDist(remainingDist)}
            </Text>
          </VStack>

          <VStack className="items-end">
            <HStack space="xs" className="items-center">
              <ChevronUp size={14} color="#10B981" />
              <Text className="font-bold text-sm" style={{ color: isDark ? '#FFFFFF' : '#111827' }}>
                {formatElev(coveredGain)} / {formatElev(totalGain)}
              </Text>
            </HStack>
            <Text size="xs" className="text-typography-500">
              Stigning: {formatElev(remainingGain)}
            </Text>
          </VStack>
        </HStack>

        {/* Controls */}
        <HStack className="px-4 py-2 border-t border-outline-100 dark:border-outline-800 justify-between items-center">
          <HStack space="md">
            <TouchableOpacity 
              onPress={toggleRoundTrip}
              className={`px-3 py-1.5 rounded-full ${activeRoute.isRoundTrip ? 'bg-emerald-500' : 'bg-background-200 dark:bg-background-800'}`}
            >
              <Text className={`text-xs font-bold ${activeRoute.isRoundTrip ? 'text-white' : 'text-typography-500'}`}>
                Tur/retur
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => setIsPickingWaypoint(true)}
              className="px-3 py-1.5 rounded-full bg-background-200 dark:bg-background-800 flex-row items-center"
            >
              <Plus size={12} color="#10B981" />
              <Text className="text-xs font-bold text-typography-500 ml-1">
                Veipunkt
              </Text>
            </TouchableOpacity>
          </HStack>

          <HStack space="sm">
            {activeRoute.waypoints.length > 0 && (
              <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <ChevronDown size={20} color="#6B7280" /> : <ChevronUp size={20} color="#6B7280" />}
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={clearRoute}>
              <X size={20} color="#EF4444" />
            </TouchableOpacity>
          </HStack>
        </HStack>

        {/* Waypoints List */}
        {isExpanded && activeRoute.waypoints.length > 0 && (
          <ScrollView style={styles.waypointList} className="px-4 pb-2">
            {activeRoute.waypoints.map((wp, idx) => (
              <HStack key={idx} className="items-center justify-between py-1">
                <HStack space="xs" className="items-center">
                  <MapPin size={12} color="#6B7280" />
                  <Text size="xs" className="text-typography-500">
                    Veipunkt {idx + 1}
                  </Text>
                </HStack>
                <TouchableOpacity onPress={() => removeWaypoint(idx)}>
                  <Trash2 size={14} color="#EF4444" />
                </TouchableOpacity>
              </HStack>
            ))}
          </ScrollView>
        )}
      </VStack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 90, // Above the tab bar
    left: 16,
    right: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
  },
  waypointList: {
    maxHeight: 120,
  }
});
import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Trophy, ChevronDown, Users, Globe } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import useColorScheme from '@/hooks/useColorScheme';
import { 
  getLeaderboardData, 
  LeaderboardEntry, 
  LeaderboardPeriod, 
  LeaderboardScope, 
  LeaderboardMetric 
} from '@/services/leaderboardService';
import { hapticsService } from '@/services/hapticsService';
import { Select, SelectTrigger, SelectInput, SelectIcon, SelectPortal, SelectBackdrop, SelectContent, SelectDragIndicatorWrapper, SelectDragIndicator, SelectItem } from '@/components/ui/select';

export const LeaderboardView = () => {
  const { user } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [scope, setScope] = useState<LeaderboardScope>('global');
  const [period, setPeriod] = useState<LeaderboardPeriod>('total');
  const [metric, setMetric] = useState<LeaderboardMetric>('unique');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getLeaderboardData(user.id, scope, period);
        setEntries(data);
      } catch (err) {
        console.error('Leaderboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, scope, period]);

  const sortedEntries = useMemo(() => {
    return [...entries].sort((a, b) => {
      const valA = metric === 'unique' ? a.uniquePeaks : a.totalTrips;
      const valB = metric === 'unique' ? b.uniquePeaks : b.totalTrips;
      if (valB !== valA) return valB - valA;
      return a.name.localeCompare(b.name);
    });
  }, [entries, metric]);

  const renderEntry = ({ item, index }: { item: LeaderboardEntry; index: number }) => {
    const rank = index + 1;
    const value = metric === 'unique' ? item.uniquePeaks : item.totalTrips;
    const label = metric === 'unique' ? (value === 1 ? 'topp' : 'topper') : (value === 1 ? 'tur' : 'turer');
    
    const isTop3 = rank <= 3;
    const trophyColor = rank === 1 ? '#FBBF24' : rank === 2 ? '#9CA3AF' : '#D97706';

    return (
      <View 
        className={`px-4 py-3 mx-4 mb-2 rounded-2xl border ${
          item.isMe 
            ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500/50' 
            : 'bg-background-50 dark:bg-background-900 border-outline-100 dark:border-outline-800'
        }`}
      >
        <HStack className="items-center" style={{ gap: 12 }}>
          <View className="w-8 items-center">
            {isTop3 ? (
              <Trophy size={20} color={trophyColor} fill={trophyColor + '20'} />
            ) : (
              <Text className="text-typography-400 dark:text-typography-500 font-bold">{rank}</Text>
            )}
          </View>

          <View className="relative">
            {item.avatarUrl ? (
              <Image 
                source={{ uri: item.avatarUrl }} 
                className="w-10 h-10 rounded-full bg-background-200 dark:bg-background-800" 
              />
            ) : (
              <View className="w-10 h-10 rounded-full bg-background-200 dark:bg-background-800 items-center justify-center">
                <Text className="text-typography-500 font-bold">
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {item.isChild && (
              <View className="absolute -right-1 -bottom-1 bg-white dark:bg-background-950 rounded-full w-5 h-5 items-center justify-center border border-outline-50 dark:border-outline-900 shadow-sm">
                <Text className="text-[10px]">{item.emoji || '👶'}</Text>
              </View>
            )}
          </View>

          <VStack className="flex-1" style={{ gap: 0 }}>
            <Text className={`font-semibold text-sm ${item.isMe ? 'text-emerald-900 dark:text-emerald-50' : 'text-typography-900 dark:text-typography-50'}`} numberOfLines={1}>
              {item.name}
            </Text>
          </VStack>

          <HStack className="items-baseline" style={{ gap: 4 }}>
            <Text className="font-bold text-base text-typography-900 dark:text-typography-50">{value}</Text>
            <Text size="xs" className="text-typography-500 dark:text-typography-400">{label}</Text>
          </HStack>
        </HStack>
      </View>
    );
  };

  return (
    <View className="flex-1">
      {/* Header Filters */}
      <VStack className="px-4 pt-4 pb-2" style={{ gap: 12 }}>
        {/* Scope Switcher */}
        <HStack className="bg-background-100 dark:bg-background-900 p-1 rounded-xl">
          <TouchableOpacity 
            onPress={() => { hapticsService.impact('light'); setScope('global'); }}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${scope === 'global' ? 'bg-white dark:bg-background-800 shadow-sm' : ''}`}
          >
            <Globe size={14} color={scope === 'global' ? '#10B981' : (isDark ? '#9CA3AF' : '#6B7280')} className="mr-2" />
            <Text size="sm" className={`font-semibold ${scope === 'global' ? 'text-typography-900 dark:text-typography-50' : 'text-typography-500'}`}>Global</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => { hapticsService.impact('light'); setScope('friends'); }}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${scope === 'friends' ? 'bg-white dark:bg-background-800 shadow-sm' : ''}`}
          >
            <Users size={14} color={scope === 'friends' ? '#10B981' : (isDark ? '#9CA3AF' : '#6B7280')} className="mr-2" />
            <Text size="sm" className={`font-semibold ${scope === 'friends' ? 'text-typography-900 dark:text-typography-50' : 'text-typography-500'}`}>Venner</Text>
          </TouchableOpacity>
        </HStack>

        {/* Metric Selector */}
        <Select
          selectedValue={metric}
          onValueChange={(val) => { hapticsService.impact('light'); setMetric(val as LeaderboardMetric); }}
        >
          <SelectTrigger variant="outline" size="md" className="rounded-xl border-outline-100 dark:border-outline-800 bg-background-50 dark:bg-background-900">
            <SelectInput placeholder="Velg metrikk" className="flex-1" />
            <SelectIcon className="mr-3">
              <ChevronDown size={18} color={isDark ? '#9CA3AF' : '#6B7280'} />
            </SelectIcon>
          </SelectTrigger>
          <SelectPortal>
            <SelectBackdrop />
            <SelectContent className={isDark ? 'bg-background-900' : 'bg-background-0'}>
              <SelectDragIndicatorWrapper>
                <SelectDragIndicator />
              </SelectDragIndicatorWrapper>
              <SelectItem label="Unike topper" value="unique" />
              <SelectItem label="Totalt antall turer" value="trips" />
            </SelectContent>
          </SelectPortal>
        </Select>

        {/* Period Selector */}
        <HStack className="bg-background-100 dark:bg-background-900 p-1 rounded-xl">
          {(['month', 'year', 'total'] as LeaderboardPeriod[]).map((p) => {
            const label = p === 'month' ? 'Måned' : p === 'year' ? 'År' : 'Totalt';
            const isActive = period === p;
            return (
              <TouchableOpacity 
                key={p}
                onPress={() => { hapticsService.impact('light'); setPeriod(p); }}
                className={`flex-1 items-center justify-center py-1.5 rounded-lg ${isActive ? 'bg-white dark:bg-background-800 shadow-sm' : ''}`}
              >
                <Text size="xs" className={`font-semibold ${isActive ? 'text-typography-900 dark:text-typography-50' : 'text-typography-500'}`}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </HStack>
      </VStack>

      {/* List */}
      <View className="flex-1 mt-2">
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#10B981" />
            <Text className="mt-4 text-typography-500">Laster lederliste...</Text>
          </View>
        ) : sortedEntries.length > 0 ? (
          <FlatList
            data={sortedEntries}
            renderItem={renderEntry}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <VStack className="items-center justify-center py-20 px-10">
            <Trophy size={48} color={isDark ? "#374151" : "#E5E7EB"} />
            <Heading size="sm" className="mt-4 text-center">Ingen data ennå</Heading>
            <Text size="sm" className="text-center text-typography-500 mt-2">
              Sjekk inn på topper for å klatre på listen!
            </Text>
          </VStack>
        )}
      </View>
    </View>
  );
};
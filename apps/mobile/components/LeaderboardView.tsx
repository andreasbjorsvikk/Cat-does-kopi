import React, { useState, useEffect, useMemo } from 'react';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Image, Platform } from 'react-native';
import { Text } from 'react-native';
import { Trophy, Users, Globe } from 'lucide-react-native';
import { useAuth } from '@/hooks/useAuth';
import useColorScheme from '@/hooks/useColorScheme';
import { useLanguage } from '@/context/LanguageContext';
import { 
  getLeaderboardData, 
  LeaderboardEntry, 
  LeaderboardPeriod, 
  LeaderboardScope, 
  LeaderboardMetric 
} from '@/services/leaderboardService';
import { hapticsService } from '@/services/hapticsService';

export const LeaderboardView = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
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
    const isFirst = rank === 1;
    const value = metric === 'unique' ? item.uniquePeaks : item.totalTrips;
    const label = metric === 'unique'
      ? (value === 1 ? t('globalLeaderboard.peak') || 'topp' : t('globalLeaderboard.peaks'))
      : (value === 1 ? t('globalLeaderboard.trip') || 'tur' : t('globalLeaderboard.trips'));
    
    const isTop3 = rank <= 3;
    const trophyColor = rank === 1 ? '#FBBF24' : rank === 2 ? '#9CA3AF' : '#D97706';

    const backgroundColor = isFirst 
      ? (isDark ? 'rgba(16, 185, 129, 0.2)' : 'rgba(16, 185, 129, 0.1)')
      : (item.isMe 
          ? (isDark ? 'rgba(6, 78, 59, 0.5)' : '#ECFDF5')
          : (isDark ? '#111827' : '#FFFFFF'));

    const borderColor = isFirst
      ? 'rgba(16, 185, 129, 0.5)'
      : (item.isMe
          ? 'rgba(16, 185, 129, 0.3)'
          : (isDark ? '#374151' : '#F3F4F6'));

    return (
      <View 
        style={{
          backgroundColor,
          borderColor,
          borderWidth: 1,
          borderRadius: 16,
          paddingHorizontal: 16,
          paddingVertical: 12,
          marginHorizontal: 16,
          marginBottom: 8,
          ...(isFirst ? {
            shadowColor: "#10B981",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 4,
          } : {})
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View className="w-8 items-center">
            {isTop3 ? (
              <Trophy size={20} color={trophyColor} fill={trophyColor + '20'} />
            ) : (
              <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 'bold' }}>{rank}</Text>
            )}
          </View>

          <View className="relative">
            {item.avatarUrl ? (
              <Image 
                source={{ uri: item.avatarUrl }} 
                style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#374151' : '#E5E7EB' }} 
              />
            ) : (
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? '#374151' : '#E5E7EB', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: 'bold' }}>
                  {item.name.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            {item.isChild && (
              <View style={{ position: 'absolute', right: -4, bottom: -4, backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderRadius: 10, width: 20, height: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#374151' : '#F3F4F6' }}>
                <Text style={{ fontSize: 10 }}>{item.emoji || '👶'}</Text>
              </View>
            )}
          </View>

          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text 
              style={{ 
                fontWeight: '600', 
                fontSize: 14, 
                color: isDark ? '#FFFFFF' : (item.isMe ? '#064E3B' : '#111827') 
              }} 
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={{ fontWeight: 'bold', fontSize: 16, color: isDark ? '#FFFFFF' : '#111827' }}>{value}</Text>
            <Text style={{ fontSize: 12, marginLeft: 4, color: isDark ? '#9CA3AF' : '#6B7280' }}>{label}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View className="flex-1">
      {/* Header Filters */}
      <View style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 }}>
        {/* Scope Switcher */}
        <View 
          style={{ 
            flexDirection: 'row', 
            backgroundColor: isDark ? '#1F2937' : '#F3F4F6', 
            padding: 4, 
            borderRadius: 12,
            marginBottom: 12
          }}
        >
          <TouchableOpacity 
            onPress={() => { hapticsService.impact('light'); setScope('global'); }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: scope === 'global' ? (isDark ? '#10B981' : '#FFFFFF') : 'transparent',
              ...(scope === 'global' && !isDark ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : {})
            }}
          >
            <Globe size={14} color={scope === 'global' ? (isDark ? '#FFFFFF' : '#10B981') : (isDark ? '#9CA3AF' : '#6B7280')} />
            <Text style={{ fontSize: 14, fontWeight: '600', marginLeft: 8, color: scope === 'global' ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280') }}>{t('globalLeaderboard.global')}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => { hapticsService.impact('light'); setScope('friends'); }}
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: scope === 'friends' ? (isDark ? '#10B981' : '#FFFFFF') : 'transparent',
              ...(scope === 'friends' && !isDark ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : {})
            }}
          >
            <Users size={14} color={scope === 'friends' ? (isDark ? '#FFFFFF' : '#10B981') : (isDark ? '#9CA3AF' : '#6B7280')} />
            <Text style={{ fontSize: 14, fontWeight: '600', marginLeft: 8, color: scope === 'friends' ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280') }}>{t('globalLeaderboard.friends')}</Text>
          </TouchableOpacity>
        </View>

        {/* Metric Selector Toggle Buttons */}
        <View 
          style={{ 
            flexDirection: 'row', 
            backgroundColor: isDark ? '#1F2937' : '#F3F4F6', 
            padding: 4, 
            borderRadius: 12,
            marginBottom: 12
          }}
        >
          <TouchableOpacity 
            onPress={() => { hapticsService.impact('light'); setMetric('unique'); }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: metric === 'unique' ? (isDark ? '#10B981' : '#FFFFFF') : 'transparent',
              ...(metric === 'unique' && !isDark ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : {})
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: metric === 'unique' ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280') }}>{t('globalLeaderboard.uniquePeaks') || 'Unike topper'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => { hapticsService.impact('light'); setMetric('trips'); }}
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: metric === 'trips' ? (isDark ? '#10B981' : '#FFFFFF') : 'transparent',
              ...(metric === 'trips' && !isDark ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : {})
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: metric === 'trips' ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280') }}>{t('globalLeaderboard.totalTrips') || 'Totalt antall turer'}</Text>
          </TouchableOpacity>
        </View>

        {/* Period Selector */}
        <View 
          style={{ 
            flexDirection: 'row', 
            backgroundColor: isDark ? '#1F2937' : '#F3F4F6', 
            padding: 4, 
            borderRadius: 12
          }}
        >
          {(['month', 'year', 'total'] as LeaderboardPeriod[]).map((p) => {
            const label = p === 'month' ? t('globalLeaderboard.month') : p === 'year' ? t('globalLeaderboard.year') : t('globalLeaderboard.total');
            const isActive = period === p;
            return (
              <TouchableOpacity 
                key={p}
                onPress={() => { hapticsService.impact('light'); setPeriod(p); }}
                style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: isActive ? (isDark ? '#10B981' : '#FFFFFF') : 'transparent',
                  ...(isActive && !isDark ? { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 } : {})
                }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: isActive ? (isDark ? '#FFFFFF' : '#111827') : (isDark ? '#9CA3AF' : '#6B7280') }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* List */}
      <View className="flex-1 mt-2">
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <ActivityIndicator size="large" color="#10B981" />
            <Text style={{ marginTop: 16, color: isDark ? '#9CA3AF' : '#6B7280' }}>{t('common.loading')}...</Text>
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
          <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 80, paddingHorizontal: 40 }}>
            <Trophy size={48} color={isDark ? "#374151" : "#E5E7EB"} />
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginTop: 16, textAlign: 'center', color: isDark ? '#FFFFFF' : '#111827' }}>
              {scope === 'friends' ? t('globalLeaderboard.noFriendCheckins') : t('globalLeaderboard.noCheckins')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};
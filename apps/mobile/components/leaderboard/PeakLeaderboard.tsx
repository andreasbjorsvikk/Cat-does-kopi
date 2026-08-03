import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Image } from 'react-native';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Trophy } from 'lucide-react-native';
import { getPeakLeaderboardData, LeaderboardEntry } from '@/services/leaderboardService';
import { useAuth } from '@/hooks/useAuth';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';
import { useLanguage } from '@/context/LanguageContext';

interface PeakLeaderboardProps {
  peakId: string;
}

export const PeakLeaderboard = ({ peakId }: PeakLeaderboardProps) => {
  const isDark = useColorScheme() === 'dark';
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const data = await getPeakLeaderboardData(peakId);
        setEntries(data);
      } catch (err) {
        console.error('Peak leaderboard fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [peakId]);

  if (loading) {
    return (
      <View className="py-10 items-center justify-center">
        <ActivityIndicator size="small" color="#10B981" />
      </View>
    );
  }

  if (entries.length === 0) return null;

  return (
    <VStack className="mt-8 mb-4" style={{ gap: 12 }}>
      <Heading 
        size="xs" 
        className="uppercase tracking-wider font-semibold"
        style={{ color: isDark ? "#9CA3AF" : "#4B5563" }}
      >
        {t('peakLeaderboard.top10')}
      </Heading>
      
      <VStack style={{ gap: 8 }}>
        {entries.map((item, index) => {
          const rank = index + 1;
          const isTop3 = rank <= 3;
          const trophyColor = rank === 1 ? '#FBBF24' : rank === 2 ? '#9CA3AF' : '#D97706';
          const isMe = user && item.userId === user.id;

          // Define dynamic colors for readability in dark mode
          // Boxes should be dark and text light for everyone in dark mode
          let bgColor = isDark 
            ? '#1F2937' 
            : (isMe ? '#ECFDF5' : '#F9FAFB');
          
          let borderColor = isDark
            ? (isMe ? 'rgba(16, 185, 129, 0.5)' : '#374151')
            : (isMe ? 'rgba(16, 185, 129, 0.5)' : '#F3F4F6');
          
          let textColor = isDark ? "#F9FAFB" : "#111827";

          return (
            <HStack 
              key={item.userId} 
              style={flattenStyle([
                { 
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  borderWidth: 1,
                  padding: 12,
                  borderRadius: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10
                }
              ])}
            >
              <View className="w-6 items-center">
                {isTop3 ? (
                  <Trophy size={16} color={trophyColor} fill={trophyColor + '20'} />
                ) : (
                  <Text style={{ color: isDark ? "#9CA3AF" : "#6B7280", fontSize: 12, fontWeight: 'bold' }}>{rank}</Text>
                )}
              </View>

              <View className="relative">
                {item.avatarUrl ? (
                  <Image source={{ uri: item.avatarUrl }} className="w-8 h-8 rounded-full" />
                ) : (
                  <View className="w-8 h-8 rounded-full bg-background-200 dark:bg-background-800 items-center justify-center">
                    <Text className="text-[10px] text-typography-500 font-bold">
                      {item.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                {item.isChild && (
                  <View className="absolute -right-1 -bottom-1 bg-white dark:bg-background-950 rounded-full w-4 h-4 items-center justify-center border border-outline-50 shadow-sm">
                    <Text className="text-[8px]">{item.emoji || '👶'}</Text>
                  </View>
                )}
              </View>

              <Text style={{ flex: 1, fontSize: 14, fontWeight: '500', color: textColor }} numberOfLines={1}>
                {item.name}
              </Text>

              <HStack className="items-baseline" style={{ gap: 2 }}>
                <Text style={{ fontWeight: 'bold', fontSize: 14, color: textColor }}>{item.totalTrips}</Text>
                <Text style={{ fontSize: 10, color: isDark ? "#9CA3AF" : "#6B7280" }}>
                  {item.totalTrips === 1 ? (t('globalLeaderboard.trip') || 'tur') : (t('globalLeaderboard.trips'))}
                </Text>
              </HStack>
            </HStack>
          );
        })}
      </VStack>
    </VStack>
  );
};
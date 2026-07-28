import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { MapPin, Calendar, Heart, Compass, Users, User, Mountain } from 'lucide-react-native';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';

export interface Participant {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  is_child: boolean;
  emoji?: string | null;
}

export interface GroupedFeedItem {
  id: string;
  parentUserId: string;
  peak_id: string;
  checked_in_at: string;
  image_url: string | null;
  parentName: string;
  parentAvatarUrl: string | null;
  peakName: string;
  peakElevation: number;
  peakMunicipality: string;
  peakCounty: string;
  peakLatitude: number;
  peakLongitude: number;
  participants: Participant[];
}

type FeedFilter = 'alle' | 'venner' | 'mine';

export function PeakFeed() {
  const isDark = useColorScheme() === 'dark';
  const [feed, setFeed] = useState<GroupedFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FeedFilter>('alle');

  const fetchFeed = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Get friendships for friends checkins
      const { data: friendships } = await supabase
        .from('friendships')
        .select('user_id, friend_id')
        .eq('status', 'accepted')
        .or(`user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`);
        
      const friendIds = (friendships || []).map(f =>
        f.user_id === currentUser.id ? f.friend_id : f.user_id
      );

      let checkinsQuery = supabase
        .from('peak_checkins')
        .select('*')
        .order('checked_in_at', { ascending: false })
        .limit(50);

      if (activeFilter === 'mine') {
        checkinsQuery = checkinsQuery.or(`user_id.eq.${currentUser.id},checked_in_by.eq.${currentUser.id}`);
      } else if (activeFilter === 'venner') {
        if (friendIds.length > 0) {
          const friendFilter = friendIds.map(id => `user_id.eq.${id},checked_in_by.eq.${id}`).join(',');
          checkinsQuery = checkinsQuery.or(friendFilter);
        } else {
          setFeed([]);
          setLoading(false);
          setRefreshing(false);
          return;
        }
      } else if (activeFilter === 'alle') {
        const ids = [currentUser.id, ...friendIds];
        const allFilter = ids.map(id => `user_id.eq.${id},checked_in_by.eq.${id}`).join(',');
        checkinsQuery = checkinsQuery.or(allFilter);
      } // 'global' has no user filters

      const { data: checkins, error } = await checkinsQuery;
      if (error) throw error;
      if (!checkins || checkins.length === 0) {
        setFeed([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Gather unique peak_ids, user_ids and checked_in_bys to fetch details
      const peakIds = [...new Set(checkins.map(c => String(c.peak_id)))];
      const allUserIds = [...new Set([
        ...checkins.map(c => c.user_id),
        ...checkins.map(c => c.checked_in_by).filter(Boolean) as string[]
      ])];

      // Query peaks
      const { data: peaks } = await supabase
        .from('peaks_db')
        .select('id, name_no, elevation_moh, municipality, county, latitude, longitude')
        .in('id', peakIds);
      const peakMap = new Map((peaks || []).map(p => [String(p.id), p as any]));

      // Query profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', allUserIds);
      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      // Query child profiles
      const { data: childProfiles } = await supabase
        .from('child_profiles')
        .select('id, name, avatar_url, emoji')
        .in('id', allUserIds);
      const childMap = new Map((childProfiles || []).map(c => [c.id, c]));

      // Grouping logic
      const groups: GroupedFeedItem[] = [];

      for (const checkin of checkins) {
        const checkinTime = new Date(checkin.checked_in_at).getTime();
        const parentUserId = checkin.checked_in_by || checkin.user_id;

        // Find if there is an existing group to merge into
        let matchedGroup = groups.find(g => 
          g.parentUserId === parentUserId &&
          g.peak_id === checkin.peak_id &&
          Math.abs(new Date(g.checked_in_at).getTime() - checkinTime) < 60 * 60 * 1000 // 1 hour
        );

        // Lookup person who is checking in
        const profile = profileMap.get(checkin.user_id);
        const child = childMap.get(checkin.user_id);
        
        const name = profile?.username || child?.name || 'Fjellvandrer';
        const avatar_url = profile?.avatar_url || child?.avatar_url || null;
        const is_child = !!child;
        const emoji = child?.emoji || null;

        const participant: Participant = {
          id: checkin.id,
          user_id: checkin.user_id,
          name,
          avatar_url,
          is_child,
          emoji
        };

        const image_url = checkin.image_url || null;

        if (matchedGroup) {
          // Parent takes priority as main post author
          if (checkin.user_id === parentUserId) {
            matchedGroup.parentName = name;
            matchedGroup.parentAvatarUrl = avatar_url;
            if (image_url) {
              matchedGroup.image_url = image_url;
            }
          } else {
            // Add as participant
            if (!matchedGroup.participants.some(p => p.user_id === checkin.user_id)) {
              matchedGroup.participants.push(participant);
            }
            if (!matchedGroup.image_url && image_url) {
              matchedGroup.image_url = image_url;
            }
          }
        } else {
          const peak = peakMap.get(String(checkin.peak_id));
          const peakName = peak?.name_no || 'Ukjent Topp';
          const peakElevation = peak?.elevation_moh || 0;
          const peakMunicipality = peak?.municipality || '';
          const peakCounty = peak?.county || '';
          const peakLatitude = peak?.latitude || 0;
          const peakLongitude = peak?.longitude || 0;

          const parentProfile = profileMap.get(parentUserId);
          const parentName = parentProfile?.username || 'Fjellvandrer';
          const parentAvatarUrl = parentProfile?.avatar_url || null;

          const newGroup: GroupedFeedItem = {
            id: checkin.id,
            parentUserId,
            peak_id: checkin.peak_id,
            checked_in_at: checkin.checked_in_at,
            image_url: image_url,
            parentName: checkin.user_id === parentUserId ? name : parentName,
            parentAvatarUrl: checkin.user_id === parentUserId ? avatar_url : parentAvatarUrl,
            peakName,
            peakElevation,
            peakMunicipality,
            peakCounty,
            peakLatitude,
            peakLongitude,
            participants: []
          };

          if (checkin.user_id !== parentUserId) {
            newGroup.participants.push(participant);
          }

          groups.push(newGroup);
        }
      }

      setFeed(groups);
    } catch (err) {
      console.error('Failed to load checkins feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, [activeFilter]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMins / 60);
    
    // Check if it's the same calendar day, yesterday, or older
    const isToday = date.toDateString() === now.toDateString();
    
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('no-NO', {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (diffMins < 60) {
      return `${diffMins} minutter siden`;
    } else if (isToday) {
      return `${diffHours} timer siden`;
    } else if (isYesterday) {
      return `i går, kl. ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('no-NO', {
        day: '2-digit',
        month: 'short',
      });
      return `${dateStr}, kl. ${timeStr}`;
    }
  };

  // Simple weather hook/fetch
  const [weatherData, setWeatherData] = useState<Record<string, { temp: number; symbol: string }>>({});

  useEffect(() => {
    const fetchWeatherForVisiblePeaks = async () => {
      const uniquePeaks = Array.from(new Set(feed.map(item => item.peak_id)));
      const newWeatherData = { ...weatherData };
      let changed = false;

      for (const peakId of uniquePeaks) {
        if (newWeatherData[peakId]) continue;
        
        const item = feed.find(i => i.peak_id === peakId);
        if (!item || !item.peakLatitude || !item.peakLongitude) continue;

        try {
          // Note: MET Norway requires a User-Agent header. 
          // In a real app, this should go through a proxy or have a proper header.
          const response = await fetch(
            `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${item.peakLatitude}&lon=${item.peakLongitude}`,
            { headers: { 'User-Agent': 'TreningsappenCatDoes/1.0' } }
          );
          const data = await response.json();
          const current = data.properties.timeseries[0].data.instant.details;
          const symbol = data.properties.timeseries[0].data.next_1_hours?.summary.symbol_code || 'clearsky_day';
          
          newWeatherData[peakId] = {
            temp: Math.round(current.air_temperature),
            symbol: symbol
          };
          changed = true;
        } catch (err) {
          console.error('Weather fetch failed for peak', peakId, err);
        }
      }

      if (changed) {
        setWeatherData(newWeatherData);
      }
    };

    if (feed.length > 0) {
      fetchWeatherForVisiblePeaks();
    }
  }, [feed]);

  const getWeatherIcon = (symbol: string) => {
    // Map MET symbols to simple display icons or text
    if (symbol.includes('cloud')) return '☁️';
    if (symbol.includes('rain')) return '🌧️';
    if (symbol.includes('snow')) return '❄️';
    if (symbol.includes('sun') || symbol.includes('clear')) return '☀️';
    return '🌤️';
  };

  const renderFeedItem = ({ item }: { item: GroupedFeedItem }) => {
    const username = item.parentName;
    const avatarUrl = item.parentAvatarUrl;
    const peakName = item.peakName;
    const elevation = item.peakElevation;
    const location = `${item.peakMunicipality}${item.peakMunicipality && item.peakCounty ? ', ' : ''}${item.peakCounty}`;
    const weather = weatherData[item.peak_id];

    return (
      <Card style={flattenStyle([styles.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }])}>
        <VStack style={{ gap: 8 }}>
          <HStack style={[styles.cardHeader, { marginBottom: 4 }]}>
            <View style={styles.avatarContainer}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={20} color={isDark ? '#9CA3AF' : '#4B5563'} />
                </View>
              )}
            </View>
            <VStack style={styles.headerInfo}>
              <Text className="font-semibold text-typography-900">{username}</Text>
              <Text size="xs" className="text-typography-500">
                {formatTimeAgo(item.checked_in_at)}
              </Text>
            </VStack>
          </HStack>

          {item.participants.length > 0 && (
            <VStack style={{ marginLeft: 14, marginTop: -6, gap: 2, marginBottom: 4 }}>
              {item.participants.map(participant => (
                <HStack key={participant.id} style={{ alignItems: 'center', gap: 6 }}>
                  <View style={styles.participantAvatarContainer}>
                    {participant.avatar_url ? (
                      <Image source={{ uri: participant.avatar_url }} style={styles.avatarImg} />
                    ) : (
                      <View style={[styles.avatarPlaceholder, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
                        <Text size="xs">{participant.emoji || '👶'}</Text>
                      </View>
                    )}
                  </View>
                  <Text size="xs" className="text-typography-500 font-medium">
                    {participant.name} var med
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}

          <HStack style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <VStack style={{ gap: 1 }}>
              <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280', fontWeight: '500' }}>
                Sjekket inn på
              </Text>
              <HStack style={{ alignItems: 'center', gap: 6 }}>
                <Mountain size={18} color="#10B981" />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: isDark ? '#F9FAFB' : '#111827' }}>
                  {peakName}
                </Text>
              </HStack>
              <Text style={{ fontSize: 11, color: isDark ? '#9CA3AF' : '#6B7280' }}>
                {elevation} moh • {location}
              </Text>
            </VStack>

            {weather && (
              <View style={[styles.weatherBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                <Text style={{ fontSize: 12 }}>{getWeatherIcon(weather.symbol)}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: isDark ? '#D1D5DB' : '#4B5563', marginLeft: 4 }}>
                  {weather.temp}°
                </Text>
              </View>
            )}
          </HStack>

          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={[styles.feedImage, { marginTop: 4 }]} />
          )}
        </VStack>

        <HStack style={styles.cardFooter}>
          <TouchableOpacity style={styles.footerAction} activeOpacity={0.7}>
            <Heart size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />
            <Text size="xs" className="text-typography-500 ml-1">Lik</Text>
          </TouchableOpacity>
        </HStack>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  const filters: { key: FeedFilter; label: string }[] = [
    { key: 'alle', label: 'Alle' },
    { key: 'venner', label: 'Venner' },
    { key: 'mine', label: 'Mine' }
  ];

  return (
    <View style={styles.container}>
      <View style={{ paddingHorizontal: 16, paddingTop: 0, height: 40 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, alignItems: 'center', justifyContent: 'center', flexGrow: 1 }}>
          {filters.map((filter) => {
            const isActive = activeFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                onPress={() => setActiveFilter(filter.key)}
                style={flattenStyle([
                  {
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: isActive ? '#10B981' : (isDark ? '#374151' : '#E5E7EB'),
                    backgroundColor: isActive ? '#10B981' : (isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.15)'),
                    alignSelf: 'center',
                  }
                ])}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: isActive ? '#FFFFFF' : (isDark ? '#D1D5DB' : '#4B5563')
                  }}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10B981']} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Compass size={48} color={isDark ? '#4B5563' : '#9CA3AF'} />
            <Text className="text-typography-500 font-semibold mt-4 text-center">
              Ingen innsjekkinger i feeden ennå
            </Text>
            <Text size="xs" className="text-typography-400 mt-1 text-center max-w-[250px]">
              Vær den første til å sjekke inn på en topp i nærheten og del turen din med andre!
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 11,
    paddingBottom: 40,
  },
  headerContainer: {
    marginBottom: 20,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  participantAvatarContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholderText: {
    color: '#4B5563',
    fontWeight: 'bold',
    fontSize: 16,
  },
  headerInfo: {
    marginLeft: 12,
    flex: 1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  cardBody: {
    marginBottom: 12,
  },
  peakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  feedImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginTop: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingTop: 10,
    gap: 16,
  },
  footerAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  weatherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 2,
  },
});
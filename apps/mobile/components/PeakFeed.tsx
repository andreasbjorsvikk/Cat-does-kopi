import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Heading } from '@/components/ui/heading';
import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { MapPin, Calendar, RefreshCw, MessageSquare, Heart, Compass } from 'lucide-react-native';
import useColorScheme from '@/hooks/useColorScheme';
import { flattenStyle } from '@/utils/flatten-style';

interface FeedItem {
  id: string;
  checked_in_at: string;
  image_url: string | null;
  profiles: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  peaks_db: {
    name: string;
    height_moh?: number;
  } | null;
}

export function PeakFeed() {
  const isDark = useColorScheme() === 'dark';
  const [feed, setFeed] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async () => {
    try {
      const { data, error } = await supabase
        .from('peak_checkins')
        .select(`
          id,
          checked_in_at,
          image_url,
          profiles:user_id (
            username,
            avatar_url
          ),
          peaks_db:peak_id (
            name,
            height_moh
          )
        `)
        .order('checked_in_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      setFeed((data || []) as unknown as FeedItem[]);
    } catch (err) {
      console.error('Failed to load checkins feed:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeed();
  };

  const formatNorwegianDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('no-NO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFeedItem = ({ item }: { item: FeedItem }) => {
    const username = item.profiles?.username || 'Fjellvandrer';
    const avatarUrl = item.profiles?.avatar_url;
    const peakName = item.peaks_db?.name || 'Ukjent Topp';

    return (
      <Card style={[styles.card, { backgroundColor: isDark ? '#1F2937' : '#FFFFFF', borderColor: isDark ? '#374151' : '#E5E7EB' }]}>
        <HStack style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarPlaceholderText}>
                  {username.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
          <VStack style={styles.headerInfo}>
            <Text className="font-semibold text-typography-900">{username}</Text>
            <HStack style={styles.metaRow}>
              <Calendar size={12} color="#9CA3AF" />
              <Text size="xs" className="text-typography-500 ml-1">
                {formatNorwegianDate(item.checked_in_at)}
              </Text>
            </HStack>
          </VStack>
        </HStack>

        <VStack style={styles.cardBody}>
          <HStack style={styles.peakBadge}>
            <MapPin size={14} color="#10B981" />
            <Text size="sm" className="font-semibold text-emerald-500 ml-1">
              Har sjekket inn på {peakName}
            </Text>
          </HStack>

          {item.image_url && (
            <Image source={{ uri: item.image_url }} style={styles.feedImage} />
          )}
        </VStack>

        <HStack style={styles.cardFooter}>
          <TouchableOpacity style={styles.footerAction} activeOpacity={0.7}>
            <Heart size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />
            <Text size="xs" className="text-typography-500 ml-1">Lik</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.footerAction} activeOpacity={0.7}>
            <Compass size={16} color={isDark ? '#9CA3AF' : '#4B5563'} />
            <Text size="xs" className="text-typography-500 ml-1">Rute</Text>
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

  return (
    <View style={styles.container}>
      <FlatList
        data={feed}
        keyExtractor={(item) => item.id}
        renderItem={renderFeedItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={['#10B981']} />
        }
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Heading size="md" className="text-typography-900 font-bold">
              Turfellesskap
            </Heading>
            <Text size="sm" className="text-typography-500 mt-1">
              Se hvem som har vært på topptur nylig
            </Text>
          </View>
        }
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
    padding: 16,
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
    padding: 14,
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
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
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
    height: 220,
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
});
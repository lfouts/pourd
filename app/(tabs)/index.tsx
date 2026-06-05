import { useState, useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View, Text, FlatList, RefreshControl,
  ActivityIndicator, TouchableOpacity, Image, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { CheckinWithDetails } from '@/types/database';
import { StarRating } from '@/components/StarRating';

export default function Feed() {
  const [checkins, setCheckins] = useState<CheckinWithDetails[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  async function fetchFeed() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setCurrentUserId(user.id);

    const { data: friendships } = await supabase
      .from('friendships')
      .select('user_id, friend_id')
      .eq('status', 'accepted')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    const friendIds = (friendships ?? []).map((f: any) =>
      f.user_id === user.id ? f.friend_id : f.user_id
    );
    const allowedIds = [user.id, ...friendIds];

    const { data, error } = await supabase
      .from('checkins')
      .select(`*, wine:wines(*), venue:venues(*), profile:profiles(*), clinks(user_id)`)
      .in('user_id', allowedIds)
      .order('created_at', { ascending: false })
      .limit(30);

    if (error) {
      console.error('Feed fetch error:', error);
    } else if (data) {
      setCheckins(data as unknown as CheckinWithDetails[]);
    }
    setLoading(false);
    setRefreshing(false);
  }

  async function handleClink(checkinId: string) {
    if (!currentUserId) return;
    const checkin = checkins.find(c => c.id === checkinId);
    if (!checkin) return;
    const hasClinked = checkin.clinks.some(c => c.user_id === currentUserId);

    setCheckins(prev => prev.map(c =>
      c.id !== checkinId ? c : {
        ...c,
        clinks: hasClinked
          ? c.clinks.filter(cl => cl.user_id !== currentUserId)
          : [...c.clinks, { user_id: currentUserId! }],
      }
    ));

    if (hasClinked) {
      await supabase.from('clinks').delete()
        .eq('checkin_id', checkinId).eq('user_id', currentUserId);
    } else {
      await (supabase.from('clinks') as any).insert({ checkin_id: checkinId, user_id: currentUserId });
    }
  }

  useFocusEffect(useCallback(() => { fetchFeed(); }, []));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFeed();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-stone-950 items-center justify-center">
        <ActivityIndicator color="#cc2852" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-950">
      <View className="border-b border-stone-800 px-4 items-start">
        <Image source={require('@/assets/logo.png')} style={{ width: 220, height: 220, marginBottom: -80, tintColor: '#a83858' }} resizeMode="contain" />
      </View>

      <FlatList
        data={checkins}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cc2852" />}
        contentContainerClassName="pb-6"
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center pt-20 gap-3">
            <Ionicons name="wine-outline" size={48} color="#44403c" />
            <Text className="text-stone-400 text-base">No check-ins yet.</Text>
            <Text className="text-stone-500 text-sm">Be the first to pour!</Text>
          </View>
        }
        renderItem={({ item }) => (
          <CheckinCard
            checkin={item}
            currentUserId={currentUserId}
            onWinePress={() => router.push(`/wine/${item.wine_id}`)}
            onUserPress={() => router.push(`/user/${item.user_id}`)}
            onClink={() => handleClink(item.id)}
          />
        )}
      />
    </SafeAreaView>
  );
}

function CheckinCard({
  checkin, currentUserId, onWinePress, onUserPress, onClink,
}: {
  checkin: CheckinWithDetails;
  currentUserId: string | null;
  onWinePress: () => void;
  onUserPress: () => void;
  onClink: () => void;
}) {
  const timeAgo = formatTimeAgo(checkin.created_at);
  const clinkCount = checkin.clinks.length;
  const hasClinked = !!currentUserId && checkin.clinks.some(c => c.user_id === currentUserId);

  return (
    <View className="mx-4 mt-4 bg-stone-900 rounded-2xl overflow-hidden">
      <View className="p-4">
        <TouchableOpacity className="flex-row items-center gap-3 mb-3" onPress={onUserPress}>
          {checkin.profile.avatar_url ? (
            <Image
              source={{ uri: checkin.profile.avatar_url }}
              className="w-9 h-9 rounded-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-9 h-9 rounded-full bg-wine-800 items-center justify-center">
              <Text className="text-white text-sm font-bold">
                {checkin.profile.username?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-white font-semibold">{checkin.profile.display_name ?? checkin.profile.username}</Text>
            <Text className="text-stone-500 text-xs">{timeAgo}</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={onWinePress} className="flex-row gap-3">
          {checkin.wine.label_image_url ? (
            <Image
              source={{ uri: checkin.wine.label_image_url }}
              className="w-16 h-20 rounded-lg"
              resizeMode="cover"
            />
          ) : (
            <View className="w-16 h-20 rounded-lg bg-stone-800 items-center justify-center">
              <Ionicons name="wine-outline" size={28} color="#78716c" />
            </View>
          )}
          <View className="flex-1 justify-center">
            <Text className="text-white font-bold text-base leading-tight">{checkin.wine.name}</Text>
            <Text className="text-cork text-sm mt-0.5">{checkin.wine.winery}</Text>
            <Text className="text-stone-500 text-xs mt-1">
              {checkin.wine.varietals.join(' · ')}
              {checkin.wine.vintage ? ` · ${checkin.wine.vintage}` : ''}
            </Text>
            <View className="mt-2">
              <StarRating rating={checkin.rating} readonly size={16} />
            </View>
          </View>
        </TouchableOpacity>

        {checkin.venue && (
          <View className="flex-row items-center gap-1.5 mt-3 pt-3 border-t border-stone-800">
            <Text className="text-base">📍</Text>
            <Text className="text-stone-400 text-sm">{checkin.venue.name}</Text>
            {checkin.venue.city && <Text className="text-stone-600 text-sm">· {checkin.venue.city}</Text>}
          </View>
        )}

        {checkin.description && (
          <Text className="text-stone-300 text-sm mt-3 leading-relaxed">{checkin.description}</Text>
        )}

        {checkin.guessed_notes && checkin.guessed_notes.length > 0 && (
          <View className="mt-3">
            <Text className="text-stone-500 text-xs mb-1.5">Guessed notes</Text>
            <View className="flex-row flex-wrap gap-1.5">
              {checkin.guessed_notes.map((note) => (
                <View key={note} className="bg-stone-800 rounded-full px-3 py-1">
                  <Text className="text-stone-300 text-xs">{note}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="flex-row justify-end mt-3 pt-3 border-t border-stone-800">
          <ClinkButton hasClinked={hasClinked} clinkCount={clinkCount} onClink={onClink} />
        </View>
      </View>
    </View>
  );
}

const CONFETTI_COLORS = ['#ec7590', '#f4a9b8', '#cc2852', '#e0476c', '#f9d0d8', '#ab1d42'];

function ClinkButton({ hasClinked, clinkCount, onClink }: {
  hasClinked: boolean;
  clinkCount: number;
  onClink: () => void;
}) {
  const iconScale = useRef(new Animated.Value(1)).current;
  const particles = useRef(
    CONFETTI_COLORS.map(() => ({
      x: new Animated.Value(0),
      y: new Animated.Value(0),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0),
    }))
  ).current;

  function handlePress() {
    onClink();

    Animated.sequence([
      Animated.timing(iconScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
      Animated.spring(iconScale, { toValue: 1, friction: 4, tension: 120, useNativeDriver: true }),
    ]).start();

    if (!hasClinked) {
      particles.forEach((p, i) => {
        const angle = (i / CONFETTI_COLORS.length) * 2 * Math.PI;
        const dist = 22;
        p.x.setValue(0); p.y.setValue(0);
        p.opacity.setValue(0); p.scale.setValue(0);
        Animated.parallel([
          Animated.timing(p.x, { toValue: Math.cos(angle) * dist, duration: 450, useNativeDriver: true }),
          Animated.timing(p.y, { toValue: Math.sin(angle) * dist, duration: 450, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(p.opacity, { toValue: 1, duration: 80, useNativeDriver: true }),
            Animated.timing(p.opacity, { toValue: 0, duration: 370, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(p.scale, { toValue: 1, duration: 120, useNativeDriver: true }),
            Animated.timing(p.scale, { toValue: 0, duration: 330, useNativeDriver: true }),
          ]),
        ]).start();
      });
    }
  }

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: CONFETTI_COLORS[i],
            opacity: p.opacity,
            transform: [{ translateX: p.x }, { translateY: p.y }, { scale: p.scale }],
          }}
        />
      ))}
      <TouchableOpacity onPress={handlePress} className="flex-row items-center gap-1.5 px-3 py-1.5">
        <Animated.View style={{ transform: [{ scale: iconScale }] }}>
          <Ionicons
            name={hasClinked ? 'wine' : 'wine-outline'}
            size={18}
            color={hasClinked ? '#ec7590' : '#78716c'}
          />
        </Animated.View>
        <Text className={`text-sm font-medium ${hasClinked ? 'text-wine-400' : 'text-stone-500'}`}>
          {clinkCount > 0 ? `${clinkCount}` : 'Clink'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, ActivityIndicator,
  TouchableOpacity, Image, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { api } from '@/lib/api';
import { Profile, CheckinWithDetails } from '@/types/database';
import { StarRating } from '@/components/StarRating';

type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'accepted';

export default function UserProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<CheckinWithDetails[]>([]);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>('none');
  const [friendshipId, setFriendshipId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendLoading, setFriendLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const user = await api.auth.getCurrentUser();
      if (!user || user.id === id) {
        router.replace('/(tabs)/profile');
        return;
      }

      const [profile, checkins, friendship] = await Promise.all([
        api.profiles.get(id).catch(() => null),
        api.checkins.list(id).catch(() => []),
        api.friendships.status(id).catch(() => null),
      ]);

      if (profile) setProfile(profile as Profile);
      if (checkins) setCheckins(checkins as unknown as CheckinWithDetails[]);

      if (friendship) {
        setFriendshipId(friendship.id);
        if (friendship.status === 'accepted') setFriendStatus('accepted');
        else if (friendship.user_id === user.id) setFriendStatus('pending_sent');
        else setFriendStatus('pending_received');
      }

      setLoading(false);
    }
    load();
  }, [id]);

  async function handleFriendAction() {
    setFriendLoading(true);

    if (friendStatus === 'none') {
      const row = await api.friendships.send(id);
      setFriendshipId(row.id);
      setFriendStatus('pending_sent');
    } else if (friendStatus === 'pending_received' && friendshipId) {
      await api.friendships.accept(friendshipId);
      setFriendStatus('accepted');
    } else if (friendStatus === 'accepted' && friendshipId) {
      Alert.alert('Remove friend', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive', onPress: async () => {
            await api.friendships.remove(friendshipId);
            setFriendStatus('none');
            setFriendshipId(null);
          },
        },
      ]);
    }
    setFriendLoading(false);
  }

  if (loading) {
    return <View className="flex-1 bg-stone-950 items-center justify-center"><ActivityIndicator color="#cc2852" /></View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-950" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="pb-8">
        <View className="px-4 pt-4 pb-6 border-b border-stone-800">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-wine-400 text-sm">← Back</Text>
          </TouchableOpacity>

          <View className="items-center">
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={{ width: 80, height: 80, borderRadius: 40, marginBottom: 12 }} />
            ) : (
              <View className="w-20 h-20 rounded-full bg-wine-800 items-center justify-center mb-3">
                <Text className="text-white text-3xl font-bold">{profile?.username?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
            )}
            <Text className="text-white text-xl font-bold">{profile?.display_name ?? profile?.username}</Text>
            {profile?.username && <Text className="text-stone-400 text-sm">@{profile.username}</Text>}
            {profile?.bio && <Text className="text-stone-300 text-sm mt-2 text-center px-8">{profile.bio}</Text>}

            <View className="flex-row gap-8 mt-3 mb-4">
              <View className="items-center">
                <Text className="text-white font-bold text-lg">{profile?.total_checkins ?? 0}</Text>
                <Text className="text-stone-400 text-xs">Pours</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleFriendAction}
              disabled={friendLoading || friendStatus === 'pending_sent'}
              className={`px-8 py-2.5 rounded-full flex-row items-center gap-2 ${
                friendStatus === 'accepted' ? 'bg-stone-800' :
                friendStatus === 'pending_sent' ? 'bg-stone-800' :
                'bg-wine-700'
              }`}
            >
              <Ionicons
                name={friendStatus === 'accepted' ? 'people' : friendStatus === 'pending_sent' ? 'time-outline' : 'person-add-outline'}
                size={16}
                color={friendStatus === 'none' || friendStatus === 'pending_received' ? '#fff' : '#78716c'}
              />
              <Text className={`font-semibold text-sm ${friendStatus === 'none' || friendStatus === 'pending_received' ? 'text-white' : 'text-stone-400'}`}>
                {friendStatus === 'accepted' ? 'Friends' :
                 friendStatus === 'pending_sent' ? 'Request sent' :
                 friendStatus === 'pending_received' ? 'Accept request' :
                 'Add friend'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {checkins.length > 0 && (
          <View className="px-4 pt-4">
            <Text className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">Recent Pours</Text>
            {checkins.map((c) => (
              <TouchableOpacity
                key={c.id}
                className="flex-row items-center gap-3 bg-stone-900 rounded-xl p-3 mb-3"
                onPress={() => router.push(`/wine/${c.wine_id}`)}
              >
                <View className="w-10 h-12 rounded-lg bg-stone-800 items-center justify-center">
                  <Ionicons name="wine-outline" size={20} color="#78716c" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-sm">{c.wine.name}</Text>
                  <Text className="text-cork text-xs">{c.wine.winery}</Text>
                  <StarRating rating={c.rating} readonly size={12} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

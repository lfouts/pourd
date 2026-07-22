import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';

interface FriendRequest {
  id: string;
  user_id: string;
  user: { username: string; display_name: string | null; avatar_url: string | null };
  created_at: string;
}

export default function Activity() {
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  async function fetchRequests() {
    const data = await api.friendships.requests().catch(() => []);
    setRequests(data as FriendRequest[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => { fetchRequests(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); fetchRequests(); }, []);

  async function accept(id: string) {
    await api.friendships.accept(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  async function decline(id: string) {
    await api.friendships.remove(id);
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }

  if (loading) {
    return <View className="flex-1 bg-stone-950 items-center justify-center"><ActivityIndicator color="#cc2852" /></View>;
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-950">
      <View className="px-4 py-3 border-b border-stone-800">
        <Text className="text-xl font-bold text-white">Activity</Text>
      </View>

      <FlatList
        data={requests}
        keyExtractor={(r) => r.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#cc2852" />}
        contentContainerClassName="px-4 pt-4 pb-8"
        ListEmptyComponent={
          <View className="items-center pt-20 gap-3">
            <Ionicons name="notifications-outline" size={48} color="#44403c" />
            <Text className="text-stone-400">No activity yet</Text>
          </View>
        }
        ListHeaderComponent={requests.length > 0 ? (
          <Text className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">
            Friend Requests
          </Text>
        ) : null}
        renderItem={({ item }) => (
          <View className="flex-row items-center gap-3 bg-stone-900 rounded-xl p-3 mb-3">
            <TouchableOpacity onPress={() => router.push(`/user/${item.user_id}`)}>
              <View className="w-10 h-10 rounded-full bg-wine-800 items-center justify-center">
                <Text className="text-white font-bold">
                  {item.user.username?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            </TouchableOpacity>
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm">
                {item.user.display_name ?? item.user.username}
              </Text>
              <Text className="text-stone-400 text-xs">wants to be friends</Text>
            </View>
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => accept(item.id)}
                className="bg-wine-700 px-3 py-1.5 rounded-full"
              >
                <Text className="text-white text-xs font-semibold">Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => decline(item.id)}
                className="bg-stone-800 px-3 py-1.5 rounded-full"
              >
                <Text className="text-stone-400 text-xs">Decline</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

import { useState } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Venue } from '@/types/database';
import { checkinStore } from '@/lib/checkin-store';
import { AddVenueModal } from '@/components/AddVenueModal';

const VENUE_LABELS: Record<Venue['type'], string> = {
  restaurant: '🍽️ Restaurant',
  bar: '🍸 Bar',
  winery: '🍇 Winery',
  shop: '🛒 Wine Shop',
  home: '🏠 Home',
  other: '📍 Other',
};


export default function SelectVenue() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();

  async function search(text: string) {
    setQuery(text);
    if (text.length < 2) { setResults([]); return; }
    setLoading(true);
    const { data } = await supabase
      .from('venues')
      .select('*')
      .ilike('name', `%${text}%`)
      .limit(15);
    setResults((data as Venue[]) ?? []);
    setLoading(false);
  }

  function selectVenue(venue: Venue | null) {
    checkinStore.set({ venue });
    router.push('/checkin/guess-notes');
  }

  return (
    <View className="flex-1 bg-stone-950">
      <Stack.Screen options={{ title: 'Select Venue' }} />
      <View className="px-4 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold mb-1">Where did you have it?</Text>
        <Text className="text-stone-400 text-sm mb-4">Search for a venue or skip</Text>

        <TextInput
          className="bg-stone-800 text-white rounded-xl px-4 py-3 text-base"
          placeholder="Search venues…"
          placeholderTextColor="#78716c"
          value={query}
          onChangeText={search}
          autoCorrect={false}
        />
      </View>

      {loading && <ActivityIndicator color="#cc2852" className="mt-4" />}

      <FlatList
        data={results}
        keyExtractor={(v) => v.id}
        contentContainerClassName="px-4 pb-4"
        ListHeaderComponent={
          <TouchableOpacity
            className="flex-row items-center gap-3 py-3 border-b border-stone-800 mb-1"
            onPress={() => selectVenue(null)}
          >
            <View className="w-10 h-10 rounded-full bg-stone-800 items-center justify-center">
              <Text className="text-lg">🚫</Text>
            </View>
            <Text className="text-stone-300 font-medium">Skip venue</Text>
          </TouchableOpacity>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center gap-3 py-3 border-b border-stone-800"
            onPress={() => selectVenue(item)}
          >
            <View className="w-10 h-10 rounded-full bg-stone-800 items-center justify-center">
              <Text className="text-xl">{VENUE_LABELS[item.type].split(' ')[0]}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">{item.name}</Text>
              <Text className="text-stone-400 text-sm">
                {[item.city, item.country].filter(Boolean).join(', ')}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          query.length >= 2 ? (
            <TouchableOpacity
              className="mt-4 flex-row items-center gap-2 py-3"
              onPress={() => setShowAdd(true)}
            >
              <View className="w-10 h-10 rounded-xl bg-wine-900 border border-wine-700 items-center justify-center">
                <Text className="text-wine-400 text-xl font-bold">+</Text>
              </View>
              <Text className="text-wine-400 font-semibold">Add "{query}" as a new venue</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <AddVenueModal
        visible={showAdd}
        initialName={query}
        onClose={() => setShowAdd(false)}
        onAdded={selectVenue}
      />
    </View>
  );
}


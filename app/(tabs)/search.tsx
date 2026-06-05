import { useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList,
  TouchableOpacity, ActivityIndicator, StyleSheet, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { searchMeiliWines } from '@/lib/meilisearch';
import {
  searchGrapeMinds, getGrapeMindsWineDetail,
  acquirePSLicense, mapToWineInsert, GrapeMindsWine,
} from '@/lib/grapeminds';
import { Wine, Venue, Profile } from '@/types/database';
import { AddVenueModal } from '@/components/AddVenueModal';

type Tab = 'wines' | 'venues' | 'people';

const s = StyleSheet.create({
  input: { flex: 1, color: '#fff', fontSize: 14 },
});

export default function Search() {
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('wines');
  const [wines, setWines] = useState<Wine[]>([]);
  const [gmWines, setGmWines] = useState<GrapeMindsWine[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [gmLoading, setGmLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showAddVenue, setShowAddVenue] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  function handleSearch(text: string) {
    setQuery(text);
    setGmWines([]);
    if (text.length < 2) { setWines([]); setVenues([]); setPeople([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(text), 350);
  }

  async function doSearch(text: string) {
    setLoading(true);

    if (tab === 'wines') {
      setGmLoading(true);
      const [local, gm] = await Promise.all([
        searchMeiliWines(text),
        searchGrapeMinds(text),
      ]);
      setWines(local);
      const localNames = new Set(local.map((w) => w.name.toLowerCase()));
      setGmWines(gm.filter((w) => w.name && !localNames.has(w.name.toLowerCase())));
      setGmLoading(false);
    } else if (tab === 'venues') {
      const { data } = await supabase.from('venues').select('*')
        .ilike('name', `%${text}%`).limit(20);
      setVenues((data as Venue[]) ?? []);
    } else {
      const { data } = await supabase.from('profiles').select('*')
        .or(`username.ilike.%${text}%,display_name.ilike.%${text}%`).limit(20);
      setPeople((data as Profile[]) ?? []);
    }
    setLoading(false);
  }

  async function importAndOpen(gm: GrapeMindsWine) {
    setImporting(true);
    const detail = await getGrapeMindsWineDetail(gm.id) ?? gm;
    await acquirePSLicense(gm.id);
    const insert = mapToWineInsert(detail);

    const { data: existing } = await supabase
      .from('wines')
      .select('*')
      .eq('name', insert.name)
      .eq('winery', insert.winery)
      .maybeSingle();

    if (existing) {
      setImporting(false);
      router.push(`/wine/${(existing as Wine).id}`);
      return;
    }

    const { data, error } = await supabase
      .from('wines')
      .insert({ ...insert } as any)
      .select()
      .single();
    setImporting(false);
    if (error || !data) {
      Alert.alert('Error', error?.message ?? 'Could not save wine.');
      return;
    }
    router.push(`/wine/${(data as Wine).id}`);
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-950">
      <View className="px-4 pt-2 pb-3">
        <Text className="text-xl font-bold text-white mb-3">Search</Text>
        <View className="bg-stone-800 rounded-xl px-4 py-3 flex-row">
          <TextInput
            style={s.input}
            placeholder={tab === 'wines' ? 'Search wines, wineries…' : 'Search venues…'}
            placeholderTextColor="#78716c"
            value={query}
            onChangeText={handleSearch}
            autoCorrect={false}
          />
        </View>

        <View className="flex-row mt-3 gap-2 items-center">
          {(['wines', 'venues', 'people'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => { setTab(t); setQuery(''); setWines([]); setVenues([]); setPeople([]); }}
              className={`px-4 py-1.5 rounded-full ${tab === t ? 'bg-wine-700' : 'bg-stone-800'}`}
            >
              <Text className={`text-sm font-medium ${tab === t ? 'text-white' : 'text-stone-400'}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
          {tab === 'venues' && (
            <TouchableOpacity
              onPress={() => setShowAddVenue(true)}
              className="ml-auto flex-row items-center gap-1"
            >
              <Ionicons name="add-circle-outline" size={18} color="#e0476c" />
              <Text className="text-wine-400 text-sm font-medium">Add venue</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading && (
        <View className="items-center py-8">
          <ActivityIndicator color="#cc2852" />
        </View>
      )}

      {tab === 'wines' && (
        <FlatList
          data={wines}
          keyExtractor={(w) => w.id}
          contentContainerClassName="px-4 pb-6"
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center gap-3 py-3 border-b border-stone-800"
              onPress={() => router.push(`/wine/${item.id}`)}
            >
              <View className="w-10 h-12 rounded-lg bg-stone-800 items-center justify-center">
                <Text className="text-xl">🍾</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{item.name}</Text>
                <Text className="text-cork text-sm">{item.winery}</Text>
                <Text className="text-stone-500 text-xs">
                  {item.varietals.join(' · ')}
                  {item.region ? ` · ${item.region.join(', ')}` : ''}
                </Text>
              </View>
              {item.avg_rating && (
                <View className="items-end">
                  <Text className="text-wine-400 font-bold">{item.avg_rating.toFixed(1)}</Text>
                  <Text className="text-stone-600 text-xs">{item.total_checkins} pours</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
          ListFooterComponent={
            query.length >= 2 ? (
              <View>
                {gmLoading && <ActivityIndicator size="small" color="#78716c" className="py-3" />}
                {gmWines.map((gm) => (
                  <TouchableOpacity
                    key={gm.id}
                    className="flex-row items-center gap-3 py-3 border-b border-stone-800"
                    onPress={() => importAndOpen(gm)}
                    disabled={importing}
                  >
                    <View className="w-10 h-12 rounded-lg bg-stone-800 items-center justify-center">
                      <Ionicons name="wine-outline" size={20} color="#78716c" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white font-semibold">{gm.name}</Text>
                      <Text className="text-cork text-sm">{gm.producer.name}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null
          }
          ListEmptyComponent={
            query.length >= 2 && !loading && !gmLoading ? (
              <Text className="text-stone-500 text-center mt-10">No wines found</Text>
            ) : null
          }
        />
      )}

      {tab === 'venues' && (
        <FlatList
          data={venues}
          keyExtractor={(v) => v.id}
          contentContainerClassName="px-4 pb-6"
          renderItem={({ item }) => (
            <View className="flex-row items-center gap-3 py-3 border-b border-stone-800">
              <View className="w-10 h-10 rounded-full bg-stone-800 items-center justify-center">
                <Text className="text-xl">{venueEmoji(item.type)}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{item.name}</Text>
                <Text className="text-stone-400 text-sm">
                  {[item.city, item.country].filter(Boolean).join(', ')}
                </Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            query.length >= 2 && !loading ? (
              <Text className="text-stone-500 text-center mt-10">No venues found</Text>
            ) : null
          }
        />
      )}
      {tab === 'people' && (
        <FlatList
          data={people}
          keyExtractor={(p) => p.id}
          contentContainerClassName="px-4 pb-6"
          renderItem={({ item }) => (
            <TouchableOpacity
              className="flex-row items-center gap-3 py-3 border-b border-stone-800"
              onPress={() => router.push(`/user/${item.id}`)}
            >
              <View className="w-10 h-10 rounded-full bg-wine-800 items-center justify-center">
                <Text className="text-white font-bold">{item.username?.[0]?.toUpperCase() ?? '?'}</Text>
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">{item.display_name ?? item.username}</Text>
                <Text className="text-stone-400 text-sm">@{item.username}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#78716c" />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            query.length >= 2 && !loading ? (
              <Text className="text-stone-500 text-center mt-10">No people found</Text>
            ) : null
          }
        />
      )}

      <AddVenueModal
        visible={showAddVenue}
        initialName={query}
        onClose={() => setShowAddVenue(false)}
        onAdded={(venue) => {
          setVenues((prev) => [venue, ...prev]);
          setShowAddVenue(false);
        }}
      />
    </SafeAreaView>
  );
}

function venueEmoji(type: Venue['type']) {
  const map: Record<Venue['type'], string> = {
    restaurant: '🍽️', bar: '🍸', winery: '🍇', shop: '🛒', home: '🏠', other: '📍',
  };
  return map[type] ?? '📍';
}

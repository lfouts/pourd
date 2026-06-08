import { useState, useRef } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, ScrollView, Alert, StyleSheet, Image,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { searchMeiliWines } from '@/lib/meilisearch';
import { Wine } from '@/types/database';
import { checkinStore } from '@/lib/checkin-store';
import {
  searchGrapeMinds, getGrapeMindsWineDetail,
  acquirePSLicense, mapToWineInsert, GrapeMindsWine,
} from '@/lib/grapeminds';

const COMMON_VARIETALS = [
  'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 'Syrah / Shiraz', 'Zinfandel',
  'Chardonnay', 'Sauvignon Blanc', 'Riesling', 'Pinot Grigio', 'Gewurztraminer',
  'Grenache', 'Tempranillo', 'Sangiovese', 'Nebbiolo', 'Malbec',
  'Chenin Blanc', 'Viognier', 'Albariño', 'Blend',
];

export default function SelectWine() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Wine[]>([]);
  const [gmResults, setGmResults] = useState<GrapeMindsWine[]>([]);
  const [loading, setLoading] = useState(false);
  const [gmLoading, setGmLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const router = useRouter();
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(text: string) {
    setQuery(text);
    setGmResults([]);
    if (text.length < 2) {
      setResults([]);
      if (searchTimer.current) clearTimeout(searchTimer.current);
      return;
    }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => doSearch(text), 350);
  }

  async function doSearch(text: string) {
    setLoading(true);
    setGmLoading(text.length >= 3);

    const [local, gm] = await Promise.all([
      searchMeiliWines(text, 15),
      text.length >= 3 ? searchGrapeMinds(text) : Promise.resolve([]),
    ]);

    setResults(local);
    setLoading(false);

    const localNames = new Set(local.map((w) => w.name.toLowerCase()));
    setGmResults(gm.filter((w) => w.name && !localNames.has(w.name.toLowerCase())));
    setGmLoading(false);
  }

  function selectWine(wine: Wine) {
    checkinStore.reset();
    checkinStore.set({ wine });
    router.push('/checkin/select-venue');
  }

  async function selectGrapeMindsWine(gm: GrapeMindsWine) {
    setLoading(true);
    const detail = await getGrapeMindsWineDetail(gm.id) ?? gm;
    await acquirePSLicense(gm.id);
    const insert = mapToWineInsert(detail);

    // Check if wine already exists before inserting
    const { data: existing } = await supabase
      .from('wines')
      .select('*')
      .eq('name', insert.name)
      .eq('winery', insert.winery)
      .maybeSingle();

    if (existing) {
      setLoading(false);
      selectWine(existing as Wine);
      return;
    }

    const { data, error } = await supabase
      .from('wines')
      .insert({ ...insert } as any)
      .select()
      .single();
    setLoading(false);
    if (error || !data) {
      Alert.alert('Error', error?.message ?? 'Could not save wine.');
      return;
    }
    selectWine(data as Wine);
  }

  return (
    <View className="flex-1 bg-stone-950">
      <Stack.Screen options={{ title: 'Search Wines' }} />
      <View className="px-4 pt-4 pb-3">
        <Text className="text-white text-2xl font-bold mb-1">What did you pour?</Text>
        <Text className="text-stone-400 text-sm mb-4">Search for a wine or add a new one</Text>

        <View className="bg-stone-800 rounded-xl px-4 py-3 flex-row">
          <TextInput
            style={s.input}
            placeholder="Search by wine or winery…"
            placeholderTextColor="#78716c"
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            autoCorrect={false}
          />
        </View>
      </View>

      {loading && <ActivityIndicator color="#cc2852" className="mt-4" />}

      <FlatList
        data={results}
        keyExtractor={(w) => w.id}
        contentContainerClassName="px-4 pb-4"
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center gap-3 py-3 border-b border-stone-800"
            onPress={() => selectWine(item)}
          >
            <View className="w-10 h-12 rounded-lg bg-stone-800 items-center justify-center">
              <Text className="text-xl">🍾</Text>
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold">{item.name}</Text>
              <Text className="text-cork text-sm">{item.winery}</Text>
              <Text className="text-stone-500 text-xs">
                {item.varietals.join(' · ')}
                {item.vintage ? ` · ${item.vintage}` : ''}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          query.length >= 2 ? (
            <View>
              {gmLoading && !loading && <ActivityIndicator size="small" color="#78716c" className="py-3" />}

              {gmResults.map((gm) => (
                <TouchableOpacity
                  key={gm.id}
                  className="flex-row items-center gap-3 py-3 border-b border-stone-800"
                  onPress={() => selectGrapeMindsWine(gm)}
                >
                  <View className="w-10 h-12 rounded-lg bg-stone-800 items-center justify-center">
                    <Ionicons name="wine-outline" size={20} color="#78716c" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">{gm.name}</Text>
                    <Text className="text-cork text-sm">{gm.producer.name}</Text>
                    {gm.grape_varieties && gm.grape_varieties.length > 0 && (
                      <Text className="text-stone-500 text-xs">
                        {gm.grape_varieties.map((g) => g.name).join(' · ')}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              <TouchableOpacity
                className="mt-4 flex-row items-center gap-2 py-3"
                onPress={() => setShowAdd(true)}
              >
                <View className="w-10 h-10 rounded-xl bg-wine-900 border border-wine-700 items-center justify-center">
                  <Text className="text-wine-400 text-xl font-bold">+</Text>
                </View>
                <Text className="text-wine-400 font-semibold">Add "{query}" as a new wine</Text>
              </TouchableOpacity>
            </View>
          ) : null
        }
      />

      <AddWineModal
        visible={showAdd}
        initialName={query}
        onClose={() => setShowAdd(false)}
        onAdded={selectWine}
      />
    </View>
  );
}

function AddWineModal({
  visible, initialName, onClose, onAdded,
}: {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onAdded: (wine: Wine) => void;
}) {
  const [name, setName] = useState(initialName);
  const [winery, setWinery] = useState('');
  const [selectedVarietals, setSelectedVarietals] = useState<string[]>([]);
  const [customVarietal, setCustomVarietal] = useState('');
  const [regions, setRegions] = useState('');
  const [country, setCountry] = useState('');
  const [vintage, setVintage] = useState('');
  const [labelUri, setLabelUri] = useState<string | null>(null);
  const [labelBase64, setLabelBase64] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function pickLabel() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to add a wine label.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], allowsEditing: true, aspect: [2, 3], quality: 0.7, base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      setLabelUri(result.assets[0].uri);
      setLabelBase64(result.assets[0].base64 ?? null);
    }
  }

  function toggleVarietal(v: string) {
    setSelectedVarietals((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    );
  }

  function addCustomVarietal() {
    const v = customVarietal.trim();
    if (!v || selectedVarietals.includes(v)) return;
    setSelectedVarietals((prev) => [...prev, v]);
    setCustomVarietal('');
  }

  async function handleSave() {
    if (!name || !winery || selectedVarietals.length === 0) {
      Alert.alert('Missing fields', 'Name, winery, and at least one varietal are required.');
      return;
    }
    setSaving(true);

    let labelImageUrl: string | null = null;
    if (labelBase64 && labelUri) {
      const ext = (labelUri.split('.').pop() ?? 'jpg').toLowerCase();
      const path = `${Date.now()}.${ext}`;
      const byteArray = Uint8Array.from(atob(labelBase64), (c) => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from('wine-labels')
        .upload(path, byteArray, { contentType: `image/${ext}`, upsert: true });
      if (!uploadError) {
        labelImageUrl = supabase.storage.from('wine-labels').getPublicUrl(path).data.publicUrl;
      }
    }

    const regionArr = regions.split(',').map((r) => r.trim()).filter(Boolean);
    const { data, error } = await supabase
      .from('wines')
      .insert({
        name,
        winery,
        varietals: selectedVarietals,
        region: regionArr.length ? regionArr : null,
        country: country || null,
        vintage: vintage ? parseInt(vintage) : null,
        label_image_url: labelImageUrl,
      } as any)
      .select()
      .single();

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    onAdded(data as Wine);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView className="flex-1 bg-stone-950 px-4 pt-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-xl font-bold">Add New Wine</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-stone-400 text-base">Cancel</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={pickLabel} className="items-center mb-6">
          {labelUri ? (
            <Image source={{ uri: labelUri }} className="w-24 h-36 rounded-xl" resizeMode="cover" />
          ) : (
            <View className="w-24 h-36 rounded-xl bg-stone-800 border border-stone-700 items-center justify-center gap-2">
              <Ionicons name="camera-outline" size={28} color="#78716c" />
              <Text className="text-stone-500 text-xs">Add label</Text>
            </View>
          )}
        </TouchableOpacity>

        {[
          { label: 'Wine Name *', value: name, set: setName, placeholder: 'e.g. Opus One' },
          { label: 'Winery *', value: winery, set: setWinery, placeholder: 'e.g. Opus One Winery' },
          { label: 'Region(s)', value: regions, set: setRegions, placeholder: 'Napa Valley, Sonoma (comma-separated)' },
          { label: 'Country', value: country, set: setCountry, placeholder: 'e.g. USA' },
          { label: 'Vintage', value: vintage, set: setVintage, placeholder: 'e.g. 2019', keyboard: 'numeric' },
        ].map(({ label, value, set, placeholder, keyboard }) => (
          <View key={label} className="mb-4">
            <Text className="text-stone-300 text-sm mb-1">{label}</Text>
            <TextInput
              className="bg-stone-800 text-white rounded-xl px-4 py-3 text-base"
              placeholder={placeholder}
              placeholderTextColor="#78716c"
              value={value}
              onChangeText={set}
              keyboardType={keyboard as any ?? 'default'}
            />
          </View>
        ))}

        <Text className="text-stone-300 text-sm mb-2">Varietals *</Text>
        <View className="flex-row flex-wrap gap-2 mb-3">
          {[...COMMON_VARIETALS, ...selectedVarietals.filter(v => !COMMON_VARIETALS.includes(v))].map((v) => (
            <TouchableOpacity
              key={v}
              onPress={() => toggleVarietal(v)}
              className={`px-3 py-1.5 rounded-full border ${
                selectedVarietals.includes(v)
                  ? 'bg-wine-700 border-wine-600'
                  : 'bg-stone-800 border-stone-700'
              }`}
            >
              <Text className={`text-sm ${selectedVarietals.includes(v) ? 'text-white' : 'text-stone-300'}`}>
                {v}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View className="flex-row gap-2 mb-6">
          <View className="flex-1 bg-stone-800 rounded-xl px-3 py-2.5 flex-row">
            <TextInput
              style={s.input}
              placeholder="Add custom varietal…"
              placeholderTextColor="#78716c"
              value={customVarietal}
              onChangeText={setCustomVarietal}
              onSubmitEditing={addCustomVarietal}
              returnKeyType="done"
            />
          </View>
          <TouchableOpacity
            onPress={addCustomVarietal}
            className="bg-stone-800 rounded-xl px-4 items-center justify-center"
          >
            <Text className="text-wine-400 font-semibold">Add</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="bg-wine-700 rounded-xl py-4 items-center mb-10"
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-semibold text-base">Add Wine</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

const s = StyleSheet.create({
  input: { flex: 1, color: '#fff', fontSize: 14 },
});

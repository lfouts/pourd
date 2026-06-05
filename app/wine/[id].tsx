import { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { Wine, CheckinWithDetails } from '@/types/database';
import { StarRating } from '@/components/StarRating';

export default function WineDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [wine, setWine] = useState<Wine | null>(null);
  const [checkins, setCheckins] = useState<CheckinWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  async function pickAndUploadLabel() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to upload a wine label.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [2, 3],
      quality: 0.7,
      base64: true,
    });
    if (result.canceled || !result.assets[0]?.base64) return;

    setUploading(true);
    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
    const path = `${wine!.id}.${ext}`;
    const byteArray = Uint8Array.from(atob(asset.base64!), (c) => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('wine-labels')
      .upload(path, byteArray, { contentType: `image/${ext}`, upsert: true });

    if (uploadError) {
      Alert.alert('Upload failed', uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('wine-labels').getPublicUrl(path);
    await (supabase as any).from('wines').update({ label_image_url: publicUrl }).eq('id', wine!.id);
    setWine((w) => w ? { ...w, label_image_url: publicUrl } : w);
    setUploading(false);
  }

  useEffect(() => {
    async function load() {
      const [{ data: w }, { data: cks }] = await Promise.all([
        supabase.from('wines').select('*').eq('id', id).single(),
        supabase
          .from('checkins')
          .select('*, wine:wines(*), venue:venues(*), profile:profiles(*)')
          .eq('wine_id', id)
          .eq('is_public', true)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);
      if (w) setWine(w as Wine);
      if (cks) setCheckins(cks as unknown as CheckinWithDetails[]);
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <View className="flex-1 bg-stone-950 items-center justify-center">
        <ActivityIndicator color="#cc2852" />
      </View>
    );
  }

  if (!wine) {
    return (
      <View className="flex-1 bg-stone-950 items-center justify-center">
        <Text className="text-stone-400">Wine not found</Text>
      </View>
    );
  }

  const officialNotes = wine.official_notes
    ? wine.official_notes.split(',').map((n) => n.trim())
    : [];

  return (
    <SafeAreaView className="flex-1 bg-stone-950" edges={['top', 'bottom']}>
      <ScrollView contentContainerClassName="pb-8">
        <View className="px-4 pt-4 pb-6 border-b border-stone-800">
          <TouchableOpacity onPress={() => router.back()} className="mb-4">
            <Text className="text-wine-400 text-sm">← Back</Text>
          </TouchableOpacity>

          <View className="flex-row gap-4">
            <TouchableOpacity
              onPress={pickAndUploadLabel}
              className="w-20 h-28 rounded-xl bg-stone-800 items-center justify-center overflow-hidden"
            >
              {wine.label_image_url ? (
                <Image
                  source={{ uri: wine.label_image_url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : uploading ? (
                <ActivityIndicator color="#cc2852" />
              ) : (
                <View className="items-center gap-1">
                  <Text className="text-4xl">🍾</Text>
                  <Ionicons name="camera-outline" size={14} color="#78716c" />
                </View>
              )}
            </TouchableOpacity>
            <View className="flex-1 justify-center">
              <Text className="text-white text-2xl font-bold leading-tight">{wine.name}</Text>
              <Text className="text-cork text-base mt-1">{wine.winery}</Text>
              {wine.vintage && (
                <Text className="text-stone-400 text-sm mt-0.5">{wine.vintage}</Text>
              )}
            </View>
          </View>

          <View className="flex-row flex-wrap gap-2 mt-4">
            {wine.varietals.map((v) => (
              <View key={v} className="bg-stone-800 rounded-full px-3 py-1">
                <Text className="text-stone-300 text-xs">{v}</Text>
              </View>
            ))}
          </View>

          {wine.region && wine.region.length > 0 && (
            <Text className="text-stone-400 text-sm mt-2">
              📍 {wine.region.join(', ')}
              {wine.country ? ` · ${wine.country}` : ''}
            </Text>
          )}

          <View className="flex-row items-center gap-3 mt-4">
            {wine.avg_rating !== null && (
              <>
                <StarRating rating={wine.avg_rating} readonly size={20} />
                <Text className="text-wine-400 font-bold text-lg">{wine.avg_rating.toFixed(1)}</Text>
              </>
            )}
            <Text className="text-stone-500 text-sm">{wine.total_checkins} pours</Text>
          </View>

          {officialNotes.length > 0 && (
            <View className="mt-4">
              <Text className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Tasting Notes
              </Text>
              <View className="flex-row flex-wrap gap-1.5">
                {officialNotes.map((note) => (
                  <View key={note} className="bg-wine-900 rounded-full px-3 py-1">
                    <Text className="text-wine-300 text-xs">{note}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            className="mt-5 bg-wine-700 rounded-xl py-3 items-center"
            onPress={() => {
              const { checkinStore } = require('@/lib/checkin-store');
              checkinStore.reset();
              checkinStore.set({ wine });
              router.push('/checkin/select-venue');
            }}
          >
            <Text className="text-white font-semibold">Log this wine</Text>
          </TouchableOpacity>
        </View>

        {checkins.length > 0 && (
          <View className="px-4 pt-4">
            <Text className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">
              Recent Pours
            </Text>
            {checkins.map((c) => (
              <View key={c.id} className="bg-stone-900 rounded-xl p-4 mb-3">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="w-7 h-7 rounded-full bg-wine-800 items-center justify-center">
                    <Text className="text-white text-xs font-bold">
                      {c.profile.username?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                  <Text className="text-white font-medium text-sm">
                    {c.profile.display_name ?? c.profile.username}
                  </Text>
                  <StarRating rating={c.rating} readonly size={13} />
                </View>
                {c.description && (
                  <Text className="text-stone-300 text-sm leading-relaxed">{c.description}</Text>
                )}
                {c.venue && (
                  <Text className="text-stone-500 text-xs mt-2">📍 {c.venue.name}</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

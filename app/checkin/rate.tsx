import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { api } from '@/lib/api';
import { checkinStore } from '@/lib/checkin-store';
import { StarRating } from '@/components/StarRating';

const SERVING_STYLES = [
  { value: 'glass', label: '🍷 Glass' },
  { value: 'bottle', label: '🍾 Bottle' },
  { value: 'tasting', label: '🫗 Tasting' },
] as const;

export default function Rate() {
  const draft = checkinStore.get();
  const [rating, setRating] = useState(0);
  const [description, setDescription] = useState('');
  const [servingStyle, setServingStyle] = useState<'glass' | 'bottle' | 'tasting' | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [showOfficialNotes, setShowOfficialNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please give this wine at least 1 star.');
      return;
    }
    setSaving(true);

    try {
      await api.checkins.create({
        wine_id: draft.wine!.id,
        venue_id: draft.venue?.id ?? null,
        rating,
        description: description || null,
        guessed_notes: draft.guessedNotes.length ? draft.guessedNotes : null,
        actual_notes: draft.wine?.official_notes
          ? draft.wine.official_notes.split(',').map((n) => n.trim())
          : null,
        serving_style: servingStyle,
        is_public: isPublic,
      });

      checkinStore.reset();
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
    setSaving(false);
  }

  const officialNotes = draft.wine?.official_notes
    ? draft.wine.official_notes.split(',').map((n) => n.trim())
    : [];

  const matchedNotes = draft.guessedNotes.filter((n) =>
    officialNotes.map((o) => o.toLowerCase()).includes(n.toLowerCase())
  );

  return (
    <View className="flex-1 bg-stone-950">
      <Stack.Screen options={{ title: 'Rate Your Pour' }} />
      <ScrollView contentContainerClassName="px-4 pt-4 pb-6">
        <Text className="text-white text-2xl font-bold mb-1">Rate your pour</Text>
        {draft.wine && (
          <View className="bg-stone-900 rounded-xl p-4 mb-6">
            <Text className="text-white font-bold text-lg">{draft.wine.name}</Text>
            <Text className="text-cork text-sm">{draft.wine.winery}</Text>
            {draft.venue && (
              <Text className="text-stone-500 text-xs mt-1">📍 {draft.venue.name}</Text>
            )}
          </View>
        )}

        {draft.guessedNotes.length > 0 && officialNotes.length > 0 && (
          <View className="bg-stone-900 rounded-xl p-4 mb-5">
            <Text className="text-stone-300 text-sm font-semibold mb-2">Your guesses</Text>
            <View className="flex-row flex-wrap gap-1.5 mb-3">
              {draft.guessedNotes.map((note) => {
                const hit = matchedNotes.map((n) => n.toLowerCase()).includes(note.toLowerCase());
                return (
                  <View
                    key={note}
                    className={`rounded-full px-3 py-1 ${hit ? 'bg-green-900' : 'bg-stone-800'}`}
                  >
                    <Text className={`text-xs ${hit ? 'text-green-300' : 'text-stone-400'}`}>
                      {hit ? '✓ ' : ''}{note}
                    </Text>
                  </View>
                );
              })}
            </View>

            {!showOfficialNotes ? (
              <TouchableOpacity
                onPress={() => setShowOfficialNotes(true)}
                className="border border-wine-700 rounded-lg py-2 items-center"
              >
                <Text className="text-wine-400 text-sm font-semibold">Reveal official notes</Text>
              </TouchableOpacity>
            ) : (
              <View>
                <Text className="text-stone-400 text-xs mb-1.5">Official tasting notes</Text>
                <View className="flex-row flex-wrap gap-1.5">
                  {officialNotes.map((note) => (
                    <View key={note} className="bg-wine-900 rounded-full px-3 py-1">
                      <Text className="text-wine-300 text-xs">{note}</Text>
                    </View>
                  ))}
                </View>
                {matchedNotes.length > 0 && (
                  <Text className="text-green-400 text-xs mt-2">
                    🎯 You got {matchedNotes.length} of {officialNotes.length} right!
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        <View className="mb-5">
          <Text className="text-stone-300 text-sm mb-3">Your rating *</Text>
          <View className="items-center">
            <StarRating rating={rating} onRate={setRating} size={40} />
            {rating > 0 && (
              <Text className="text-stone-400 text-xs mt-2">{ratingLabel(rating)}</Text>
            )}
          </View>
        </View>

        <View className="mb-5">
          <Text className="text-stone-300 text-sm mb-2">Serving style</Text>
          <View className="flex-row gap-2">
            {SERVING_STYLES.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                onPress={() => setServingStyle(value)}
                className={`flex-1 py-2.5 rounded-xl border items-center ${
                  servingStyle === value ? 'bg-wine-700 border-wine-600' : 'bg-stone-800 border-stone-700'
                }`}
              >
                <Text className={`text-sm ${servingStyle === value ? 'text-white' : 'text-stone-300'}`}>
                  {label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View className="mb-5">
          <Text className="text-stone-300 text-sm mb-2">Tasting notes & thoughts</Text>
          <TextInput
            className="bg-stone-800 text-white rounded-xl px-4 py-3 text-base"
            placeholder="Describe what you tasted, how you felt, food pairings…"
            placeholderTextColor="#78716c"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            style={{ minHeight: 100 }}
          />
        </View>

        <TouchableOpacity
          className="flex-row items-center gap-3 mb-6"
          onPress={() => setIsPublic(!isPublic)}
        >
          <View className={`w-6 h-6 rounded border-2 items-center justify-center ${
            isPublic ? 'bg-wine-700 border-wine-600' : 'border-stone-600'
          }`}>
            {isPublic && <Text className="text-white text-xs font-bold">✓</Text>}
          </View>
          <Text className="text-stone-300 text-sm">Share to public feed</Text>
        </TouchableOpacity>
      </ScrollView>

      <View className="px-4 pb-8 pt-3 border-t border-stone-800">
        <TouchableOpacity
          className="bg-wine-700 rounded-xl py-4 items-center"
          onPress={handleSubmit}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-semibold text-base">Log Pour</Text>
          }
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ratingLabel(r: number) {
  return ['', 'Terrible', 'Poor', 'Good', 'Great', 'Outstanding'][r] ?? '';
}

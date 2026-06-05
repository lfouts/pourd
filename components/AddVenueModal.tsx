import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, Modal, ActivityIndicator, Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Venue } from '@/types/database';

const VENUE_TYPES: Venue['type'][] = ['restaurant', 'bar', 'winery', 'shop', 'home', 'other'];
const VENUE_LABELS: Record<Venue['type'], string> = {
  restaurant: '🍽️ Restaurant',
  bar: '🍸 Bar',
  winery: '🍇 Winery',
  shop: '🛒 Wine Shop',
  home: '🏠 Home',
  other: '📍 Other',
};

export function AddVenueModal({
  visible, initialName, onClose, onAdded,
}: {
  visible: boolean;
  initialName: string;
  onClose: () => void;
  onAdded: (venue: Venue) => void;
}) {
  const [name, setName] = useState(initialName);
  const [type, setType] = useState<Venue['type']>('restaurant');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name) { Alert.alert('Missing', 'Venue name is required.'); return; }
    setSaving(true);
    const { data, error } = await supabase
      .from('venues')
      .insert({ name, type, city: city || null, country: country || null } as any)
      .select()
      .single();
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    onAdded(data as Venue);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <ScrollView className="flex-1 bg-stone-950 px-4 pt-6">
        <View className="flex-row justify-between items-center mb-6">
          <Text className="text-white text-xl font-bold">Add Venue</Text>
          <TouchableOpacity onPress={onClose}>
            <Text className="text-stone-400 text-base">Cancel</Text>
          </TouchableOpacity>
        </View>

        <View className="mb-4">
          <Text className="text-stone-300 text-sm mb-1">Venue Name *</Text>
          <TextInput
            className="bg-stone-800 text-white rounded-xl px-4 py-3 text-base"
            placeholder="e.g. The Wine Room"
            placeholderTextColor="#78716c"
            value={name}
            onChangeText={setName}
          />
        </View>

        <Text className="text-stone-300 text-sm mb-2">Venue Type</Text>
        <View className="flex-row flex-wrap gap-2 mb-4">
          {VENUE_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setType(t)}
              className={`px-3 py-1.5 rounded-full border ${
                type === t ? 'bg-wine-700 border-wine-600' : 'bg-stone-800 border-stone-700'
              }`}
            >
              <Text className={`text-sm ${type === t ? 'text-white' : 'text-stone-300'}`}>
                {VENUE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {[
          { label: 'City', value: city, set: setCity, placeholder: 'e.g. San Francisco' },
          { label: 'Country', value: country, set: setCountry, placeholder: 'e.g. USA' },
        ].map(({ label, value, set, placeholder }) => (
          <View key={label} className="mb-4">
            <Text className="text-stone-300 text-sm mb-1">{label}</Text>
            <TextInput
              className="bg-stone-800 text-white rounded-xl px-4 py-3 text-base"
              placeholder={placeholder}
              placeholderTextColor="#78716c"
              value={value}
              onChangeText={set}
            />
          </View>
        ))}

        <TouchableOpacity
          className="bg-wine-700 rounded-xl py-4 items-center mb-10"
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-semibold text-base">Add Venue</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </Modal>
  );
}

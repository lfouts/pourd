import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { checkinStore } from '@/lib/checkin-store';

const NOTE_CATEGORIES: Record<string, string[]> = {
  'Red Fruit': ['Cherry', 'Raspberry', 'Strawberry', 'Cranberry', 'Red Plum'],
  'Dark Fruit': ['Blackberry', 'Blueberry', 'Black Cherry', 'Plum', 'Cassis'],
  'Dried Fruit': ['Raisin', 'Fig', 'Prune', 'Date'],
  'Tree Fruit': ['Apple', 'Pear', 'Peach', 'Apricot', 'Quince'],
  'Citrus': ['Lemon', 'Lime', 'Grapefruit', 'Orange Zest'],
  'Floral': ['Rose', 'Violet', 'Jasmine', 'Lavender', 'Hibiscus'],
  'Herbal': ['Mint', 'Eucalyptus', 'Bay Leaf', 'Thyme', 'Grass'],
  'Spice': ['Black Pepper', 'Cinnamon', 'Clove', 'Nutmeg', 'Anise'],
  'Oak & Wood': ['Vanilla', 'Caramel', 'Toast', 'Cedar', 'Smoke'],
  'Earth': ['Mushroom', 'Truffle', 'Leather', 'Tobacco', 'Wet Stone'],
  'Other': ['Chocolate', 'Coffee', 'Butter', 'Cream', 'Mineral', 'Honey'],
};

export default function GuessNotes() {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();
  const draft = checkinStore.get();

  function toggleNote(note: string) {
    setSelected((prev) =>
      prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
    );
  }

  function handleNext() {
    checkinStore.set({ guessedNotes: selected });
    router.push('/checkin/rate');
  }

  function handleSkip() {
    checkinStore.set({ guessedNotes: [] });
    router.push('/checkin/rate');
  }

  return (
    <View className="flex-1 bg-stone-950">
      <Stack.Screen options={{ title: 'Guess the Notes' }} />
      <ScrollView contentContainerClassName="px-4 pt-4 pb-6">
        <Text className="text-white text-2xl font-bold mb-1">Guess the notes</Text>
        <Text className="text-stone-400 text-sm mb-1">
          What do you taste in <Text className="text-wine-400 font-semibold">{draft.wine?.name}</Text>?
        </Text>
        <Text className="text-stone-500 text-xs mb-6">
          Select as many as you like — you'll see the official notes on the next screen.
        </Text>

        {Object.entries(NOTE_CATEGORIES).map(([category, notes]) => (
          <View key={category} className="mb-5">
            <Text className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-2">
              {category}
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {notes.map((note) => {
                const active = selected.includes(note);
                return (
                  <TouchableOpacity
                    key={note}
                    onPress={() => toggleNote(note)}
                    className={`px-3 py-1.5 rounded-full border ${
                      active ? 'bg-wine-700 border-wine-600' : 'bg-stone-800 border-stone-700'
                    }`}
                  >
                    <Text className={`text-sm ${active ? 'text-white' : 'text-stone-300'}`}>
                      {note}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View className="px-4 pb-8 pt-3 border-t border-stone-800 gap-3">
        {selected.length > 0 && (
          <Text className="text-stone-400 text-sm text-center">
            {selected.length} note{selected.length !== 1 ? 's' : ''} selected
          </Text>
        )}
        <TouchableOpacity
          className="bg-wine-700 rounded-xl py-4 items-center"
          onPress={handleNext}
        >
          <Text className="text-white font-semibold text-base">
            {selected.length > 0 ? 'Reveal & Rate' : 'Skip to Rating'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSkip} className="items-center py-2">
          <Text className="text-stone-500 text-sm">Skip guessing</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

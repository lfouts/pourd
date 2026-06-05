import { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { Profile, CheckinWithDetails } from '@/types/database';
import { StarRating } from '@/components/StarRating';
import { useRouter, useFocusEffect } from 'expo-router';

export default function ProfileScreen() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [checkins, setCheckins] = useState<CheckinWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useFocusEffect(useCallback(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: prof }, { data: cks }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase
          .from('checkins')
          .select('*, wine:wines(*), venue:venues(*), profile:profiles(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

      if (prof) setProfile(prof as Profile);
      if (cks) setCheckins(cks as unknown as CheckinWithDetails[]);
      setLoading(false);
    }
    load();
  }, []));

  async function handlePickAvatar() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUploading(false); return; }

    const asset = result.assets[0];
    const ext = (asset.uri.split('.').pop() ?? 'jpg').toLowerCase();
    const path = `${user.id}/avatar.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const base64 = asset.base64;
    if (!base64) {
      Alert.alert('Error', 'Could not read image data.');
      setUploading(false);
      return;
    }

    const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, byteArray, { contentType, upsert: true });

    if (uploadError) {
      Alert.alert('Upload failed', uploadError.message);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

    const { error: updateError } = await (supabase.from('profiles') as any)
      .update({ avatar_url: publicUrl })
      .eq('id', user.id);

    if (updateError) {
      Alert.alert('Save failed', updateError.message);
      setUploading(false);
      return;
    }

    const { data: fresh } = await supabase
      .from('profiles').select('*').eq('id', user.id).single();
    if (fresh) setProfile(fresh as Profile);
    setUploading(false);
  }

  async function handleSignOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  if (loading) {
    return (
      <View className="flex-1 bg-stone-950 items-center justify-center">
        <ActivityIndicator color="#cc2852" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-stone-950">
      <FlatList
        data={checkins}
        keyExtractor={(c) => c.id}
        contentContainerClassName="pb-8"
        ListHeaderComponent={
          <View>
            <View className="px-4 py-3 border-b border-stone-800 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-white">Profile</Text>
              <TouchableOpacity onPress={handleSignOut}>
                <Text className="text-stone-400 text-sm">Sign out</Text>
              </TouchableOpacity>
            </View>

            <View className="items-center py-8">
              <TouchableOpacity onPress={handlePickAvatar} className="mb-3 relative">
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    style={{ width: 80, height: 80, borderRadius: 40 }}
                  />
                ) : (
                  <View className="w-20 h-20 rounded-full bg-wine-800 items-center justify-center">
                    <Text className="text-white text-3xl font-bold">
                      {profile?.username?.[0]?.toUpperCase() ?? '?'}
                    </Text>
                  </View>
                )}
                <View className="absolute bottom-0 right-0 bg-stone-700 rounded-full w-6 h-6 items-center justify-center border-2 border-stone-950">
                  {uploading
                    ? <ActivityIndicator size="small" color="#fff" />
                    : <Ionicons name="camera" size={12} color="#fff" />
                  }
                </View>
              </TouchableOpacity>

              <Text className="text-white text-xl font-bold">
                {profile?.display_name ?? profile?.username}
              </Text>
              {profile?.username && (
                <Text className="text-stone-400 text-sm">@{profile.username}</Text>
              )}
              {profile?.bio && (
                <Text className="text-stone-300 text-sm mt-2 text-center px-8">{profile.bio}</Text>
              )}
              <View className="flex-row gap-8 mt-4">
                <Stat label="Pours" value={profile?.total_checkins ?? 0} />
              </View>
            </View>

            {checkins.length > 0 && (
              <View className="px-4 pb-2 border-b border-stone-800">
                <Text className="text-stone-400 text-sm font-medium">Recent pours</Text>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="items-center py-16 gap-3">
            <Ionicons name="wine-outline" size={48} color="#44403c" />
            <Text className="text-stone-400">No pours yet</Text>
            <TouchableOpacity
              className="mt-4 bg-wine-700 px-6 py-2.5 rounded-full"
              onPress={() => router.push('/checkin/select-wine')}
            >
              <Text className="text-white font-semibold">Log your first wine</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mx-4 mt-3 flex-row items-center gap-3 bg-stone-900 rounded-xl p-3"
            onPress={() => router.push(`/wine/${item.wine_id}`)}
          >
            <View className="w-10 h-12 rounded-lg bg-stone-800 items-center justify-center">
              <Ionicons name="wine-outline" size={22} color="#78716c" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-sm">{item.wine.name}</Text>
              <Text className="text-cork text-xs">{item.wine.winery}</Text>
              <StarRating rating={item.rating} readonly size={12} />
            </View>
            {item.venue && (
              <Text className="text-stone-500 text-xs text-right">{item.venue.name}</Text>
            )}
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View className="items-center">
      <Text className="text-white font-bold text-lg">{value}</Text>
      <Text className="text-stone-400 text-xs">{label}</Text>
    </View>
  );
}

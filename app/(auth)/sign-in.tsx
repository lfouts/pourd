import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, StyleSheet, Image,
} from 'react-native';
import { Link } from 'expo-router';
import { supabase } from '@/lib/supabase';

const s = StyleSheet.create({
  input: { flex: 1, color: '#fff', fontSize: 16 },
});

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Sign in failed', error.message);
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-stone-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View className="flex-1 px-6 justify-center">
        <View className="mb-10 items-center">
          <Image
            source={require('@/assets/logo.png')}
            style={{ width: 200, height: 140 }}
            resizeMode="contain"
          />
          <Text className="text-stone-400 mt-2 text-base">Your personal wine journal</Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-stone-300 text-sm mb-1 ml-1">Email</Text>
            <View className="bg-stone-800 rounded-xl px-4 py-3.5 flex-row">
              <TextInput
                style={s.input}
                placeholder="you@example.com"
                placeholderTextColor="#78716c"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          <View>
            <Text className="text-stone-300 text-sm mb-1 ml-1">Password</Text>
            <View className="bg-stone-800 rounded-xl px-4 py-3.5 flex-row">
              <TextInput
                style={s.input}
                placeholder="••••••••"
                placeholderTextColor="#78716c"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>
          </View>

          <TouchableOpacity
            className="bg-wine-700 rounded-xl py-4 items-center mt-2"
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-semibold text-base">Sign In</Text>
            }
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8 gap-1">
          <Text className="text-stone-400">Don't have an account?</Text>
          <Link href="/(auth)/sign-up">
            <Text className="text-wine-400 font-semibold">Sign up</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

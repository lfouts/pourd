import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView, StyleSheet, Image,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

const s = StyleSheet.create({
  input: { flex: 1, color: '#fff', fontSize: 16 },
});

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { setUserId } = useAuth();

  async function handleSignUp() {
    if (!email || !password || !username) {
      Alert.alert('Missing fields', 'Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Password too short', 'Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.auth.signUp(email, password, username);
      setUserId(data.user.id);
      router.replace('/(tabs)');
    } catch (e: any) {
      Alert.alert('Sign up failed', e.message);
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-stone-950"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerClassName="flex-grow px-6 justify-center">
        <View className="mb-10 items-center">
          <Image
            source={require('@/assets/logo.png')}
            style={{ width: 200, height: 140 }}
            resizeMode="contain"
          />
          <Text className="text-stone-400 mt-2 text-base">Create your account</Text>
        </View>

        <View className="gap-4">
          <View>
            <Text className="text-stone-300 text-sm mb-1 ml-1">Username</Text>
            <View className="bg-stone-800 rounded-xl px-4 py-3.5 flex-row">
              <TextInput
                style={s.input}
                placeholder="wineenthusiast42"
                placeholderTextColor="#78716c"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          </View>

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
            {password.length > 0 && password.length < 8 && (
              <Text className="text-red-400 text-xs mt-1 ml-1">Password must be at least 8 characters</Text>
            )}
          </View>

          <TouchableOpacity
            className="bg-wine-700 rounded-xl py-4 items-center mt-2"
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-semibold text-base">Create Account</Text>
            }
          </TouchableOpacity>
        </View>

        <View className="flex-row justify-center mt-8 gap-1">
          <Text className="text-stone-400">Already have an account?</Text>
          <Link href="/(auth)/sign-in">
            <Text className="text-wine-400 font-semibold">Sign in</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

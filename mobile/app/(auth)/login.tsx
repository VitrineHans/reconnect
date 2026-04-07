import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../theme/tokens';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const router = useRouter();

  const sendOtp = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setLoading(false);
    if (error) {
      console.error('[login] signInWithOtp error:', error.message);
      setErrorMsg(error.message);
      return;
    }
    router.push({ pathname: '/(auth)/verify', params: { email: email.trim().toLowerCase() } });
  };

  const signInWithPassword = async () => {
    if (!email.trim() || !password.trim()) return;
    setLoading(true);
    setErrorMsg('');
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });
    setLoading(false);
    if (error) {
      console.error('[login] signInWithPassword error:', error.message);
      setErrorMsg(error.message);
    }
    // auth guard handles redirect on success
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.wordmark}>Reconnect</Text>
        <Text style={styles.subtitle}>Daily video Q&A with your closest people</Text>
      </View>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholder="your@email.com"
        placeholderTextColor={colors.textMuted}
        value={email}
        onChangeText={setEmail}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      {usePassword && (
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      )}
      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
      <TouchableOpacity
        style={styles.button}
        onPress={usePassword ? signInWithPassword : sendOtp}
        disabled={loading}
      >
        {loading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.buttonText}>{usePassword ? 'Sign in' : 'Send Code'}</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.toggleButton} onPress={() => { setUsePassword(v => !v); setErrorMsg(''); }}>
        <Text style={styles.toggleText}>
          {usePassword ? 'Use email code instead' : 'Sign in with password'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing[6],
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  hero: {
    marginBottom: spacing[8],
  },
  wordmark: {
    fontSize: typography.sizes['3xl'],
    fontFamily: typography.families.display,
    color: colors.text,
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
    lineHeight: typography.sizes.base * typography.lineHeights.normal,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.text,
    backgroundColor: colors.surface2,
    marginBottom: spacing[4],
  },
  inputFocused: {
    borderColor: colors.ember,
  },
  button: {
    backgroundColor: colors.ember,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  buttonText: {
    color: colors.bg,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '600',
  },
  errorText: {
    color: colors.destructive,
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    marginBottom: spacing[3],
    textAlign: 'center',
  },
  toggleButton: {
    marginTop: spacing[4],
    alignItems: 'center',
  },
  toggleText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodyMedium,
    color: colors.textSecondary,
  },
});

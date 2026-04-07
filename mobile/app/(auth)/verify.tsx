import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../theme/tokens';

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const verify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code,
      type: 'email',
    });
    setLoading(false);
    if (error) Alert.alert('Error', 'Invalid or expired code. Please try again.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Check your email 📬</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to{'\n'}{email}</Text>
      </View>
      <TextInput
        style={[styles.input, focused && styles.inputFocused]}
        placeholder="000000"
        placeholderTextColor={colors.textMuted}
        value={code}
        onChangeText={setCode}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        keyboardType="number-pad"
        maxLength={6}
        autoFocus
      />
      <TouchableOpacity
        style={[styles.button, code.length !== 6 && styles.buttonDisabled]}
        onPress={verify}
        disabled={loading || code.length !== 6}
      >
        {loading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.buttonText}>Verify</Text>}
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
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.families.display,
    color: colors.text,
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
    fontSize: typography.sizes.xl,
    fontFamily: typography.families.bodyBold,
    color: colors.text,
    backgroundColor: colors.surface2,
    textAlign: 'center',
    letterSpacing: 12,
    marginBottom: spacing[4],
  },
  inputFocused: {
    borderColor: colors.primary,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '700',
  },
});

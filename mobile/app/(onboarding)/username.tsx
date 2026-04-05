import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../theme/tokens';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

export default function UsernameScreen() {
  const { session } = useSession();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'username' | 'displayName' | null>(null);

  const submit = async () => {
    if (!USERNAME_REGEX.test(username)) {
      Alert.alert('Invalid username', 'Use 3–20 characters: letters, numbers, underscores only.');
      return;
    }
    if (!displayName.trim() || displayName.length > 50) {
      Alert.alert('Invalid name', 'Display name must be 1–50 characters.');
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ username: username.trim(), display_name: displayName.trim() })
      .eq('id', session!.user.id);
    setLoading(false);
    if (error?.code === '23505') {
      Alert.alert('Username taken', 'That username is already in use. Try another.');
      return;
    }
    if (error) Alert.alert('Error', error.message);
    // Auth guard detects username is now set → redirects to questionnaire automatically
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Create your profile</Text>
        <Text style={styles.subtitle}>How should your friends know you?</Text>
      </View>
      <Text style={styles.label}>Username</Text>
      <TextInput
        style={[styles.input, focusedField === 'username' && styles.inputFocused]}
        placeholder="e.g. alex_jones"
        placeholderTextColor={colors.textMuted}
        value={username}
        onChangeText={setUsername}
        onFocus={() => setFocusedField('username')}
        onBlur={() => setFocusedField(null)}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.label}>Display name</Text>
      <TextInput
        style={[styles.input, focusedField === 'displayName' && styles.inputFocused]}
        placeholder="e.g. Alex"
        placeholderTextColor={colors.textMuted}
        value={displayName}
        onChangeText={setDisplayName}
        onFocus={() => setFocusedField('displayName')}
        onBlur={() => setFocusedField(null)}
      />
      <TouchableOpacity style={styles.button} onPress={submit} disabled={loading}>
        {loading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.buttonText}>Continue</Text>}
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
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: spacing[2],
  },
  subtitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
  },
  label: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: spacing[2],
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
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
    marginBottom: spacing[5],
  },
  inputFocused: {
    borderColor: colors.ember,
  },
  button: {
    backgroundColor: colors.ember,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: spacing[2],
  },
  buttonText: {
    color: colors.bg,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '600',
  },
});

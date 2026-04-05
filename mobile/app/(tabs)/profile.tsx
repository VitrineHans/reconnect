import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../../hooks/useSession';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../theme/tokens';

export default function ProfileScreen() {
  const { session } = useSession();
  const { profile, profileLoading, refetch } = useProfile(session);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [focused, setFocused] = useState(false);

  const saveDisplayName = async () => {
    if (!displayName.trim() || displayName.length > 50) {
      Alert.alert('Invalid', 'Display name must be 1–50 characters.');
      return;
    }
    setSaving(true);
    const { error } = await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('id', session!.user.id);
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    refetch();
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setUploading(true);
    const ext = uri.split('.').pop() ?? 'jpg';
    const path = `${session!.user.id}/${Date.now()}.${ext}`;
    const response = await fetch(uri);
    const blob = await response.blob();
    const { error: uploadError } = await supabase.storage.from('avatars').upload(path, blob, { contentType: `image/${ext}` });
    if (uploadError) { setUploading(false); Alert.alert('Upload failed', uploadError.message); return; }
    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', session!.user.id);
    setUploading(false);
    refetch();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    // auth guard redirects to /(auth)/login automatically
  };

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.ember} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrapper}>
        {uploading
          ? <View style={styles.avatar}><ActivityIndicator color={colors.ember} /></View>
          : profile?.avatar_url
            ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            : (
              <View style={[styles.avatar, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {profile?.display_name?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
        <Text style={styles.changePhoto}>Change photo</Text>
      </TouchableOpacity>

      <Text style={styles.username}>@{profile?.username}</Text>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Display name</Text>
        <TextInput
          style={[styles.input, focused && styles.inputFocused]}
          value={displayName}
          onChangeText={setDisplayName}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Your name"
          placeholderTextColor={colors.textMuted}
        />
      </View>

      <TouchableOpacity style={styles.button} onPress={saveDisplayName} disabled={saving}>
        {saving
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.buttonText}>Save</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  container: {
    padding: spacing[6],
    alignItems: 'center',
    backgroundColor: colors.bg,
    flexGrow: 1,
  },
  avatarWrapper: {
    alignItems: 'center',
    marginTop: spacing[10],
    marginBottom: spacing[2],
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    backgroundColor: colors.surface3,
    borderWidth: 1.5,
    borderColor: colors.strokeStrong,
  },
  avatarInitial: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.families.display,
    color: colors.textSecondary,
  },
  changePhoto: {
    marginTop: spacing[2],
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodyMedium,
    color: colors.ember,
  },
  username: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
    marginBottom: spacing[8],
    marginTop: spacing[2],
  },
  fieldGroup: {
    width: '100%',
    marginBottom: spacing[4],
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
    width: '100%',
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.text,
    backgroundColor: colors.surface2,
  },
  inputFocused: {
    borderColor: colors.ember,
  },
  button: {
    width: '100%',
    backgroundColor: colors.ember,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  buttonText: {
    color: colors.bg,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '600',
  },
  signOutButton: {
    marginTop: 'auto',
    padding: spacing[4],
  },
  signOutText: {
    color: colors.flame,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyMedium,
  },
});

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Image, ActivityIndicator, StyleSheet, Alert, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSession } from '../../hooks/useSession';
import { useProfile } from '../../hooks/useProfile';
import { supabase } from '../../lib/supabase';

export default function ProfileScreen() {
  const { session } = useSession();
  const { profile, profileLoading, refetch } = useProfile(session);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

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

  if (profileLoading) return <View style={styles.container}><ActivityIndicator /></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity onPress={pickAvatar} style={styles.avatarWrapper}>
        {uploading ? <ActivityIndicator style={styles.avatar} /> :
          profile?.avatar_url ? <Image source={{ uri: profile.avatar_url }} style={styles.avatar} /> :
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>{profile?.display_name?.[0]?.toUpperCase() ?? '?'}</Text>
          </View>}
        <Text style={styles.changePhoto}>Change photo</Text>
      </TouchableOpacity>
      <Text style={styles.username}>@{profile?.username}</Text>
      <Text style={styles.label}>Display name</Text>
      <TextInput style={styles.input} value={displayName} onChangeText={setDisplayName} placeholder="Your name" />
      <TouchableOpacity style={styles.button} onPress={saveDisplayName} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, alignItems: 'center', backgroundColor: '#fff', flexGrow: 1 },
  avatarWrapper: { alignItems: 'center', marginTop: 40, marginBottom: 8 },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { backgroundColor: '#eee', justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 32, fontWeight: 'bold', color: '#666' },
  changePhoto: { marginTop: 8, fontSize: 14, color: '#007AFF' },
  username: { fontSize: 18, color: '#999', marginBottom: 32 },
  label: { alignSelf: 'flex-start', fontSize: 14, fontWeight: '600', marginBottom: 6, color: '#333' },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 14, fontSize: 16, marginBottom: 16 },
  button: { width: '100%', backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center', marginBottom: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOutButton: { marginTop: 'auto', padding: 16 },
  signOutText: { color: '#ff3b30', fontSize: 16 },
});

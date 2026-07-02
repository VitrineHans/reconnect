import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/**
 * Personal-profile editing lives in Settings (the Profile page is a display
 * surface). Shared here so the logic is screen-independent and testable.
 */

export const DISPLAY_NAME_MAX = 50;

export function validateDisplayName(name: string): boolean {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= DISPLAY_NAME_MAX;
}

export async function updateDisplayName(userId: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: name.trim() })
    .eq('id', userId);
  if (error) throw new Error(error.message);
}

/**
 * Open the photo library, upload the chosen image to the avatars bucket and
 * persist the public URL. Returns the new URL, or null when the user cancels.
 */
export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  });
  if (result.canceled) return null;

  const uri = result.assets[0].uri;
  const ext = uri.split('.').pop() ?? 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const response = await fetch(uri);
  const blob = await response.blob();

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: `image/${ext}` });
  if (uploadError) throw new Error(uploadError.message);

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', userId);
  if (updateError) throw new Error(updateError.message);

  return publicUrl;
}

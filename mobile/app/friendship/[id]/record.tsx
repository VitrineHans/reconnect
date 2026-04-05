import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { VideoRecorder } from '../../../components/VideoRecorder';
import { UploadProgress } from '../../../components/UploadProgress';
import { useVideoUpload } from '../../../hooks/useVideoUpload';
import { useSession } from '../../../hooks/useSession';
import { supabase } from '../../../lib/supabase';

export default function RecordScreen() {
  const { id, questionId } = useLocalSearchParams<{ id: string; questionId: string }>();
  const { session } = useSession();
  const router = useRouter();
  const { upload, progress, uploading } = useVideoUpload();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);

  async function handleVideoReady(uri: string) {
    if (!session?.user?.id || !id || !questionId) return;
    setPendingUri(uri);
    setUploadError(null);

    try {
      const storagePath = await upload(id, session.user.id, questionId, uri);
      await insertResponse(id, questionId, session.user.id, storagePath);
      router.replace('/(tabs)/home');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed');
      setPendingUri(null);
    }
  }

  async function insertResponse(
    friendshipId: string,
    qId: string,
    userId: string,
    videoUrl: string,
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error } = await supabase.from('question_responses').insert({
      friendship_id: friendshipId,
      question_id: qId,
      user_id: userId,
      video_url: videoUrl,
      expires_at: expiresAt,
    });
    if (error) throw new Error(error.message);
  }

  function handleRetry() {
    setUploadError(null);
    setPendingUri(null);
  }

  if (uploadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{uploadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!pendingUri && (
        <VideoRecorder
          onVideoReady={handleVideoReady}
          onCancel={() => router.back()}
        />
      )}
      {uploading && (
        <View style={styles.progressOverlay}>
          <Text style={styles.uploadingText}>Uploading...</Text>
          <UploadProgress progress={progress} visible={uploading} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  uploadingText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#000',
  },
  errorText: { color: '#FF4E4E', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  retryButton: {
    backgroundColor: '#6B4EFF',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 32,
  },
  retryText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

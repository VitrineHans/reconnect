import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { VideoRecorder } from '../../../components/VideoRecorder';
import { UploadProgress } from '../../../components/UploadProgress';
import { useVideoUpload } from '../../../hooks/useVideoUpload';
import { useSession } from '../../../hooks/useSession';
import { supabase } from '../../../lib/supabase';
import { colors, typography, spacing, radius } from '../../../theme/tokens';
import { notifyFriendOfReveal } from '../../../hooks/useNotifications';

export default function RecordScreen() {
  const { t } = useTranslation();
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
      // Simulator bypass: no real file to upload
      const storagePath =
        uri === 'simulator://recording'
          ? `simulator/${id}/${session.user.id}/${questionId}.mp4`
          : await upload(id, session.user.id, questionId, uri);
      await insertResponseAndStreak(id, questionId, session.user.id, storagePath);
      router.replace('/(tabs)/home');
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : t('flow.uploadFailed'));
      setPendingUri(null);
    }
  }

  async function insertResponseAndStreak(
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

    // Check if friend already answered (would make this the second response)
    const { data: responses } = await supabase
      .from('question_responses')
      .select('user_id')
      .eq('friendship_id', friendshipId)
      .eq('question_id', qId);

    const friendAlreadyAnswered = (responses ?? []).some((r: { user_id: string }) => r.user_id !== userId);

    // This is the second submission → both have answered → tell the friend.
    if (friendAlreadyAnswered) {
      await notifyFriendOfReveal(friendshipId, userId);
    }
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
          <Text style={styles.retryText}>{t('flow.tryAgain')}</Text>
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
          <Text style={styles.uploadingText}>{t('flow.uploading')}</Text>
          <UploadProgress progress={progress} visible={uploading} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing[4],
  },
  uploadingText: {
    color: colors.text,
    fontSize: typography.sizes.lg,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: '#000',
  },
  errorText: {
    color: colors.flame,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    textAlign: 'center',
    marginBottom: spacing[6],
  },
  retryButton: {
    backgroundColor: colors.ember,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[4],
    borderRadius: radius.full,
  },
  retryText: {
    color: colors.bg,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '600',
  },
});

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { VideoRecorder } from '../../../components/VideoRecorder';
import { UploadProgress } from '../../../components/UploadProgress';
import { useVideoUpload } from '../../../hooks/useVideoUpload';
import { useSession } from '../../../hooks/useSession';
import { supabase } from '../../../lib/supabase';
import { colors, typography, spacing, radius } from '../../../theme/tokens';

export default function GroupRecordScreen() {
  const { t } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const router = useRouter();
  const { upload, progress, uploading } = useVideoUpload();
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingUri, setPendingUri] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    supabase
      .from('groups')
      .select('current_question_id')
      .eq('id', id)
      .single()
      .then(({ data }) =>
        setQuestionId((data as { current_question_id: string | null } | null)?.current_question_id ?? null),
      );
  }, [id]);

  async function handleVideoReady(uri: string) {
    if (!session?.user?.id || !id || !questionId) return;
    setPendingUri(uri);
    setUploadError(null);
    try {
      const storagePath =
        uri === 'simulator://recording'
          ? `simulator/${id}/${session.user.id}/${questionId}.mp4`
          : await upload(id, session.user.id, questionId, uri);
      // No group streaks in v1, so no expires_at. RLS unlocks others once this lands.
      const { error } = await supabase.from('question_responses').insert({
        group_id: id,
        question_id: questionId,
        user_id: session.user.id,
        video_url: storagePath,
      });
      if (error) throw new Error(error.message);
      router.replace(`/group/${id}`);
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : t('flow.uploadFailed'));
      setPendingUri(null);
    }
  }

  if (uploadError) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{uploadError}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => { setUploadError(null); setPendingUri(null); }}>
          <Text style={styles.retryText}>{t('flow.tryAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!pendingUri && (
        <VideoRecorder onVideoReady={handleVideoReady} onCancel={() => router.back()} />
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
  container: { flex: 1, backgroundColor: '#000' },
  progressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center', alignItems: 'center', gap: spacing[4],
  },
  uploadingText: {
    color: colors.text, fontSize: typography.sizes.lg,
    fontFamily: typography.families.bodySemiBold, fontWeight: '600',
  },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6], backgroundColor: '#000' },
  errorText: {
    color: colors.flame, fontSize: typography.sizes.base, fontFamily: typography.families.body,
    textAlign: 'center', marginBottom: spacing[6],
  },
  retryButton: { backgroundColor: colors.ember, paddingHorizontal: spacing[8], paddingVertical: spacing[4], borderRadius: radius.full },
  retryText: { color: colors.bg, fontSize: typography.sizes.base, fontFamily: typography.families.bodySemiBold, fontWeight: '600' },
});

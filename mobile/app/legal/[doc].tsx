import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { colors, typography, spacing, radius } from '../../theme/tokens';

// Privacy / Terms are the same layout with different copy — one dynamic route
// (/legal/privacy, /legal/terms) keeps it DRY.
export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const router = useRouter();
  const { t } = useTranslation();

  const isTerms = doc === 'terms';
  const title = isTerms ? t('legal.termsTitle') : t('legal.privacyTitle');
  const body = isTerms ? t('legal.termsBody') : t('legal.privacyBody');

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{t('legal.draftNotice')}</Text>
        </View>
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[5],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
  },
  back: {
    fontSize: 34,
    lineHeight: 34,
    color: colors.text,
    fontFamily: typography.families.body,
  },
  backSpacer: {
    width: 24,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.families.display,
    color: colors.text,
    flexShrink: 1,
    textAlign: 'center',
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  notice: {
    backgroundColor: colors.surface3,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[5],
  },
  noticeText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodyMedium,
    color: colors.textSecondary,
  },
  body: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.text,
    lineHeight: typography.sizes.base * typography.lineHeights.relaxed,
  },
});

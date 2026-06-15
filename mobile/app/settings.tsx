import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import i18n, {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  setLanguage,
} from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing, radius } from '../theme/tokens';

export default function SettingsScreen() {
  const { t, i18n: i18nInstance } = useTranslation();
  const router = useRouter();
  const current = i18nInstance.language;

  const confirmSignOut = () => {
    Alert.alert(t('settings.signOutConfirmTitle'), t('settings.signOutConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.signOut'),
        style: 'destructive',
        // auth guard redirects to /(auth)/login automatically
        onPress: () => { void supabase.auth.signOut(); },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Language */}
        <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
        <Text style={styles.sectionSubtitle}>{t('settings.languageSubtitle')}</Text>
        <View style={styles.card}>
          {SUPPORTED_LANGUAGES.map((lang, i) => {
            const active = current === lang || current.startsWith(`${lang}-`);
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.row, i > 0 && styles.rowDivider]}
                onPress={() => { void setLanguage(lang); }}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.rowLabel}>{LANGUAGE_NAMES[lang]}</Text>
                {active && <Text style={styles.check}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>{t('settings.account')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(onboarding)/questionnaire')}>
            <View style={styles.rowTextGroup}>
              <Text style={styles.rowLabel}>{t('settings.editPreferences')}</Text>
              <Text style={styles.rowSubtitle}>{t('settings.editPreferencesSubtitle')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOut} onPress={confirmSignOut}>
          <Text style={styles.signOutText}>{t('settings.signOut')}</Text>
        </TouchableOpacity>
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
  },
  content: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  sectionLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
    color: colors.textSecondary,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginTop: spacing[6],
    marginBottom: spacing[1],
  },
  sectionSubtitle: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.body,
    color: colors.textMuted,
    marginBottom: spacing[3],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  rowDivider: {
    borderTopWidth: 1,
    borderTopColor: colors.stroke,
  },
  rowTextGroup: {
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyMedium,
    color: colors.text,
  },
  rowSubtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  check: {
    fontSize: typography.sizes.base,
    color: colors.ember,
    fontFamily: typography.families.bodySemiBold,
  },
  chevron: {
    fontSize: typography.sizes.lg,
    color: colors.textMuted,
  },
  signOut: {
    marginTop: spacing[8],
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  signOutText: {
    color: colors.flame,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyMedium,
  },
});

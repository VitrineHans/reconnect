import { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Switch, ActivityIndicator, BackHandler } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Constants from 'expo-constants';
import i18n, {
  SUPPORTED_LANGUAGES,
  LANGUAGE_NAMES,
  setLanguage,
} from '../lib/i18n';
import { supabase } from '../lib/supabase';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';
import { getNotificationsEnabled, setNotificationsEnabled } from '../lib/notificationPrefs';
import { applyNotificationPreference } from '../hooks/useNotifications';
import { validateDisplayName, updateDisplayName, pickAndUploadAvatar } from '../lib/profileEdit';
import { Avatar } from '../components/Avatar';
import { colors, typography, spacing, radius } from '../theme/tokens';

export default function SettingsScreen() {
  const { t, i18n: i18nInstance } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const { profile, refetch } = useProfile(session);
  const current = i18nInstance.language;

  const [displayName, setDisplayName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [notifEnabled, setNotifEnabled] = useState(true);

  useEffect(() => { getNotificationsEnabled().then(setNotifEnabled); }, []);
  useEffect(() => { setDisplayName(profile?.display_name ?? ''); }, [profile?.display_name]);

  // Back — from wherever Settings was reached — always lands on the Profile page.
  const goBackToProfile = useCallback(() => {
    router.replace('/(tabs)/profile');
  }, [router]);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goBackToProfile();
      return true;
    });
    return () => sub.remove();
  }, [goBackToProfile]);

  const nameDirty = profile != null && displayName.trim() !== (profile.display_name ?? '');

  const saveDisplayName = async () => {
    if (!session?.user?.id) return;
    if (!validateDisplayName(displayName)) {
      Alert.alert(t('profile.invalidTitle'), t('profile.invalidDisplayName'));
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(session.user.id, displayName);
      refetch();
    } catch (e) {
      Alert.alert(t('common.error'), e instanceof Error ? e.message : '');
    } finally {
      setSavingName(false);
    }
  };

  const changePhoto = async () => {
    if (!session?.user?.id || uploading) return;
    setUploading(true);
    try {
      const url = await pickAndUploadAvatar(session.user.id);
      if (url) refetch();
    } catch (e) {
      Alert.alert(t('profile.uploadFailed'), e instanceof Error ? e.message : '');
    } finally {
      setUploading(false);
    }
  };

  const toggleNotifications = async (value: boolean) => {
    setNotifEnabled(value);
    await setNotificationsEnabled(value);
    const uid = session?.user?.id;
    if (uid) {
      try { await applyNotificationPreference(uid, value); } catch { /* non-critical */ }
    }
  };

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

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goBackToProfile}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Profile — the single place to edit personal info */}
        <Text style={styles.sectionLabel}>{t('settings.profileSection')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={changePhoto} accessibilityRole="button" disabled={uploading}>
            {uploading ? (
              <View style={styles.avatarLoading}><ActivityIndicator color={colors.ember} /></View>
            ) : (
              <Avatar
                name={profile?.display_name ?? profile?.username ?? '?'}
                url={profile?.avatar_url}
                size={48}
              />
            )}
            <View style={styles.rowTextGroup}>
              <Text style={[styles.rowLabel, styles.photoLabel]}>{t('profile.changePhoto')}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>

          <View style={[styles.row, styles.rowDivider, styles.nameRow]}>
            <View style={styles.rowTextGroup}>
              <Text style={styles.fieldLabel}>{t('profile.displayName')}</Text>
              <TextInput
                style={styles.nameInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder={t('profile.displayNamePlaceholder')}
                placeholderTextColor={colors.textMuted}
                maxLength={50}
                returnKeyType="done"
                onSubmitEditing={saveDisplayName}
                accessibilityLabel={t('profile.displayName')}
              />
            </View>
            {nameDirty && (
              <TouchableOpacity style={styles.saveBtn} onPress={saveDisplayName} disabled={savingName} accessibilityRole="button">
                {savingName
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.saveBtnText}>{t('profile.save')}</Text>}
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.row, styles.rowDivider]}>
            <View style={styles.rowTextGroup}>
              <Text style={styles.fieldLabel}>{t('settings.username')}</Text>
              <Text style={styles.rowLabel}>@{profile?.username ?? ''}</Text>
            </View>
          </View>
        </View>

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

        {/* Notifications */}
        <Text style={styles.sectionLabel}>{t('settings.notifications')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, styles.rowTextGroup]}>{t('settings.notificationsSubtitle')}</Text>
            <Switch
              value={notifEnabled}
              onValueChange={toggleNotifications}
              trackColor={{ true: colors.ember, false: colors.stroke }}
            />
          </View>
        </View>

        {/* Legal */}
        <Text style={styles.sectionLabel}>{t('settings.legal')}</Text>
        <View style={styles.card}>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/legal/privacy')}>
            <Text style={styles.rowLabel}>{t('settings.privacyPolicy')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.row, styles.rowDivider]} onPress={() => router.push('/legal/terms')}>
            <Text style={styles.rowLabel}>{t('settings.terms')}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <Text style={styles.sectionLabel}>{t('settings.about')}</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t('settings.version')}</Text>
            <Text style={styles.rowSubtitle}>{appVersion}</Text>
          </View>
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
    gap: spacing[3],
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
  avatarLoading: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoLabel: {
    color: colors.ember,
  },
  nameRow: {
    alignItems: 'flex-end',
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodySemiBold,
    color: colors.textSecondary,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  nameInput: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.text,
    paddingVertical: 2,
    paddingHorizontal: 0,
  },
  saveBtn: {
    backgroundColor: colors.ember,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    minWidth: 60,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
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

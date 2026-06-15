import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../hooks/useSession';
import { useFriendships } from '../../hooks/useFriendships';
import { createGroup, inviteToGroup, MAX_GROUP_MEMBERS } from '../../hooks/useGroups';
import { colors, typography, spacing, radius, shadows } from '../../theme/tokens';

export default function CreateGroupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const { friendships, loading } = useFriendships(userId);

  const [name, setName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const toggle = (friendId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(friendId)) next.delete(friendId);
      else if (next.size < MAX_GROUP_MEMBERS - 1) next.add(friendId); // -1 for the creator
      else Alert.alert(t('group.full'));
      return next;
    });
  };

  const canCreate = name.trim().length > 0 && !saving;

  const handleCreate = async () => {
    if (!userId || !canCreate) return;
    setSaving(true);
    try {
      const groupId = await createGroup(name, userId);
      for (const friendId of selected) {
        await inviteToGroup(groupId, friendId);
      }
      router.replace(`/group/${groupId}`);
    } catch (e) {
      setSaving(false);
      Alert.alert(t('group.createFailed'), e instanceof Error ? e.message : '');
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('group.createTitle')}</Text>
        <View style={styles.backSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TextInput
          style={styles.input}
          placeholder={t('group.namePlaceholder')}
          placeholderTextColor={colors.textMuted}
          value={name}
          onChangeText={setName}
          maxLength={50}
        />

        <Text style={styles.sectionLabel}>{t('group.pickFriends')}</Text>
        {loading && <ActivityIndicator color={colors.ember} style={{ marginTop: spacing[4] }} />}
        {!loading && friendships.length === 0 && (
          <Text style={styles.hint}>{t('group.emptyFriends')}</Text>
        )}
        {friendships.map((f) => {
          const label = f.friendProfile.display_name ?? f.friendProfile.username;
          const on = selected.has(f.friendId);
          return (
            <TouchableOpacity key={f.friendId} style={[styles.row, on && styles.rowOn]} onPress={() => toggle(f.friendId)}>
              <Text style={styles.rowLabel}>{label}</Text>
              <Text style={[styles.check, on && styles.checkOn]}>{on ? '✓' : '＋'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, !canCreate && styles.buttonDisabled]} onPress={handleCreate} disabled={!canCreate}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.buttonText}>{t('group.create')}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[5], paddingTop: spacing[12], paddingBottom: spacing[4],
  },
  back: { fontSize: 34, lineHeight: 34, color: colors.text, fontFamily: typography.families.body },
  backSpacer: { width: 24 },
  title: { fontSize: typography.sizes.lg, fontFamily: typography.families.display, color: colors.text },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[6] },
  input: {
    borderWidth: 1.5, borderColor: colors.stroke, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: spacing[4],
    fontSize: typography.sizes.base, fontFamily: typography.families.body,
    color: colors.text, backgroundColor: colors.surface2, marginBottom: spacing[6],
  },
  sectionLabel: {
    fontSize: typography.sizes.sm, fontFamily: typography.families.bodySemiBold,
    color: colors.textSecondary, letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase', marginBottom: spacing[3],
  },
  hint: { color: colors.textMuted, fontSize: typography.sizes.sm, fontFamily: typography.families.body },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderColor: colors.stroke, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3], marginBottom: spacing[2],
    backgroundColor: colors.surface,
  },
  rowOn: { borderColor: colors.ember },
  rowLabel: { fontSize: typography.sizes.base, fontFamily: typography.families.bodyMedium, color: colors.text },
  check: { fontSize: typography.sizes.lg, color: colors.textMuted },
  checkOn: { color: colors.ember },
  footer: { paddingHorizontal: spacing[5], paddingBottom: spacing[10], paddingTop: spacing[3] },
  button: {
    backgroundColor: colors.ember, borderRadius: radius.md,
    paddingVertical: spacing[4], alignItems: 'center', ...shadows.emberGlow,
  },
  buttonDisabled: { opacity: 0.4 },
  buttonText: { color: '#fff', fontSize: typography.sizes.md, fontFamily: typography.families.bodySemiBold, fontWeight: '600' },
});

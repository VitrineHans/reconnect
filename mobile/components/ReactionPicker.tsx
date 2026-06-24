import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Reaction } from '../hooks/useReactions';
import { colors, typography, spacing, radius, shadows } from '../theme/tokens';

const EMOJIS = ['❤️', '😂', '😮', '🥹', '🔥', '👏'];

export interface ReactionPickerProps {
  onSend: (reaction: Reaction) => void;
  onSkip: () => void;
}

/** Shown after watching a friend's reveal: tap an emoji to send instantly, or
 *  type a short line, or skip. */
export function ReactionPicker({ onSend, onSkip }: ReactionPickerProps) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const canSend = text.trim().length > 0;

  return (
    <View style={styles.screen}>
      <Text style={styles.prompt}>{t('reactions.prompt')}</Text>

      <View style={styles.emojiRow}>
        {EMOJIS.map((e) => (
          <TouchableOpacity
            key={e}
            testID={`reaction-emoji-${e}`}
            style={styles.emojiBtn}
            onPress={() => onSend({ emoji: e })}
            activeOpacity={0.7}
          >
            <Text style={styles.emoji}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TextInput
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={t('reactions.placeholder')}
        placeholderTextColor={colors.textMuted}
        maxLength={140}
        returnKeyType="send"
        onSubmitEditing={() => canSend && onSend({ body: text })}
      />

      <TouchableOpacity
        style={[styles.send, !canSend && styles.sendDisabled]}
        onPress={() => onSend({ body: text })}
        disabled={!canSend}
        activeOpacity={0.85}
      >
        <Text style={styles.sendText}>{t('reactions.send')}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.skip} onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Text style={styles.skipText}>{t('reactions.skip')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[5],
  },
  prompt: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.families.display,
    color: colors.text,
    textAlign: 'center',
  },
  emojiRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  emojiBtn: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stroke,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 28 },
  input: {
    borderWidth: 1.5,
    borderColor: colors.stroke,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.text,
    backgroundColor: colors.surface2,
  },
  send: {
    backgroundColor: colors.ember,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
    ...shadows.emberGlow,
  },
  sendDisabled: { opacity: 0.4, shadowOpacity: 0, elevation: 0 },
  sendText: { color: '#fff', fontSize: typography.sizes.md, fontFamily: typography.families.bodySemiBold, fontWeight: '600' },
  skip: { alignItems: 'center', paddingVertical: spacing[2] },
  skipText: { color: colors.textMuted, fontSize: typography.sizes.base, fontFamily: typography.families.bodyMedium },
});

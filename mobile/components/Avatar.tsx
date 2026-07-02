import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, typography } from '../theme/tokens';

/**
 * Shared cached avatar. expo-image with memory+disk cache so profile photos
 * load once and never re-fetch or jank on scroll; deterministic pastel
 * initials placeholder when there is no photo.
 */

const PLACEHOLDER_TINTS = ['#FFE8D6', '#FFF3C4', '#D8F5EA', '#DCEEFF', '#EDE4FF'] as const;

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function tintFor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return PLACEHOLDER_TINTS[h % PLACEHOLDER_TINTS.length];
}

export interface AvatarProps {
  name: string;
  url?: string | null;
  size?: number;
}

export const Avatar = memo(function Avatar({ name, url, size = 44 }: AvatarProps) {
  const dims = { width: size, height: size, borderRadius: size / 2 };

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.image, dims]}
        cachePolicy="memory-disk"
        recyclingKey={url}
        transition={150}
        contentFit="cover"
        accessibilityLabel={name}
      />
    );
  }

  return (
    <View
      style={[styles.placeholder, dims, { backgroundColor: tintFor(name) }]}
      accessibilityLabel={name}
    >
      <Text style={[styles.initials, { fontSize: Math.max(11, Math.round(size * 0.36)) }]}>
        {initialsOf(name)}
      </Text>
    </View>
  );
});

export interface AvatarStackMember {
  id: string;
  name: string;
  url?: string | null;
}

export interface AvatarStackProps {
  members: AvatarStackMember[];
  size?: number;
  max?: number;
}

/** Overlapping facepile — the visual identity of a group. */
export const AvatarStack = memo(function AvatarStack({ members, size = 34, max = 3 }: AvatarStackProps) {
  const shown = members.slice(0, max);
  const extra = members.length - shown.length;
  const overlap = -Math.round(size * 0.35);

  return (
    <View style={styles.stack}>
      {shown.map((m, i) => (
        <View key={m.id} style={[styles.ring, i > 0 && { marginLeft: overlap }]}>
          <Avatar name={m.name} url={m.url} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View
          style={[
            styles.ring,
            styles.extra,
            { width: size + 4, height: size + 4, borderRadius: (size + 4) / 2, marginLeft: overlap },
          ]}
        >
          <Text style={styles.extraText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surface3,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.textSecondary,
    fontFamily: typography.families.bodySemiBold,
    letterSpacing: typography.letterSpacing.wider,
  },
  stack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ring: {
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: 9999,
    backgroundColor: colors.surface,
  },
  extra: {
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extraText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodySemiBold,
  },
});

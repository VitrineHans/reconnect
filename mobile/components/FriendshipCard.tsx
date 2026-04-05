import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { FriendshipWithState } from '../hooks/useFriendships';

export interface FriendshipCardProps {
  friendship: FriendshipWithState;
  onPress: (id: string) => void;
}

function getTimeRemaining(expiresAt: string): string {
  const diff = Date.parse(expiresAt) - Date.now();
  if (diff <= 0) return '0h 0m left';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left`;
}

function getPreview(questionText: string | null): string {
  if (!questionText) return 'No question yet';
  return questionText.length > 80 ? `${questionText.slice(0, 80)}…` : questionText;
}

export function FriendshipCard({ friendship, onPress }: FriendshipCardProps) {
  const { id, friendProfile, streakCount, questionText, state, expiresAt } = friendship;
  const friendName = friendProfile.display_name ?? friendProfile.username;

  const [countdown, setCountdown] = useState<string>(
    expiresAt ? getTimeRemaining(expiresAt) : '',
  );

  useEffect(() => {
    if (!expiresAt || state !== 'your_turn') return;
    const interval = setInterval(() => {
      setCountdown(getTimeRemaining(expiresAt));
    }, 60_000);
    return () => clearInterval(interval);
  }, [expiresAt, state]);

  const isRevealReady = state === 'reveal_ready';

  const ctaText =
    state === 'reveal_ready'
      ? 'Watch Now 👀'
      : state === 'your_turn'
        ? 'Record Answer'
        : `Waiting for ${friendName}...`;

  return (
    <TouchableOpacity
      testID={`friendship-card-${id}`}
      style={[styles.card, isRevealReady && styles.revealReadyCard]}
      activeOpacity={0.8}
      onPress={() => onPress(id)}
    >
      <View style={styles.header}>
        <Text style={styles.friendName}>{friendName}</Text>
        <Text style={styles.streak}>🔥 {streakCount}</Text>
      </View>
      <Text style={styles.question} numberOfLines={2}>
        {getPreview(questionText)}
      </Text>
      {state === 'your_turn' && expiresAt && (
        <Text style={styles.countdown}>{countdown}</Text>
      )}
      <Text style={[styles.cta, isRevealReady && styles.revealReadyCta]}>
        {ctaText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  revealReadyCard: {
    borderColor: '#6B4EFF',
    backgroundColor: '#F5F2FF',
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#111' },
  streak: { fontSize: 14, color: '#f57c00' },
  question: { fontSize: 14, color: '#444', marginBottom: 8 },
  countdown: { fontSize: 12, color: '#888', marginBottom: 6 },
  cta: { fontSize: 13, color: '#888', fontWeight: '500' },
  revealReadyCta: { color: '#6B4EFF', fontWeight: '700' },
});

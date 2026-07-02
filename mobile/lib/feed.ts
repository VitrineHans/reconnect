import type { FriendshipWithState, FriendshipState } from '../hooks/useFriendships';
import type { GroupWithState } from '../hooks/useGroups';

/**
 * Home feed: friendships and groups merged into ONE list (no sections).
 * Most actionable first — reveal_ready, then your_turn, then waiting —
 * with a stable name sort inside each bucket so cards don't jump around.
 */

export type FeedItem =
  | { kind: 'friendship'; key: string; friendship: FriendshipWithState }
  | { kind: 'group'; key: string; group: GroupWithState };

const STATE_PRIORITY: Record<FriendshipState, number> = {
  reveal_ready: 0,
  your_turn: 1,
  waiting: 2,
};

function stateOf(item: FeedItem): FriendshipState {
  return item.kind === 'friendship' ? item.friendship.state : item.group.state;
}

function nameOf(item: FeedItem): string {
  if (item.kind === 'group') return item.group.name;
  const p = item.friendship.friendProfile;
  return p.display_name ?? p.username;
}

export function mergeFeed(
  friendships: FriendshipWithState[],
  groups: GroupWithState[],
): FeedItem[] {
  const items: FeedItem[] = [
    ...friendships.map((friendship): FeedItem => ({
      kind: 'friendship',
      key: `f-${friendship.id}`,
      friendship,
    })),
    ...groups.map((group): FeedItem => ({
      kind: 'group',
      key: `g-${group.id}`,
      group,
    })),
  ];

  return items.sort((a, b) => {
    const byState = STATE_PRIORITY[stateOf(a)] - STATE_PRIORITY[stateOf(b)];
    if (byState !== 0) return byState;
    return nameOf(a).localeCompare(nameOf(b));
  });
}

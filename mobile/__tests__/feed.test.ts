// Home feed merge: friendships + groups in ONE list, most actionable first.

import { mergeFeed } from '../lib/feed';
import type { FriendshipWithState, FriendshipState } from '../hooks/useFriendships';
import type { GroupWithState, GroupState } from '../hooks/useGroups';

function friendship(id: string, name: string, state: FriendshipState): FriendshipWithState {
  return {
    id,
    friendId: `u-${id}`,
    friendProfile: { username: name.toLowerCase(), display_name: name, avatar_url: null },
    streakCount: 0,
    questionText: 'Q?',
    state,
    expiresAt: null,
    myResponseId: null,
    currentQuestionId: null,
  };
}

function group(id: string, name: string, state: GroupState): GroupWithState {
  return {
    id,
    name,
    createdBy: 'me',
    members: [],
    questionText: 'Q?',
    currentQuestionId: null,
    iAnswered: false,
    othersAnswered: 0,
    state,
  };
}

describe('mergeFeed', () => {
  it('interleaves friendships and groups by state priority, not by kind', () => {
    const feed = mergeFeed(
      [friendship('f1', 'Zoe', 'waiting'), friendship('f2', 'Amy', 'your_turn')],
      [group('g1', 'Crew', 'reveal_ready'), group('g2', 'Boekenclub', 'waiting')],
    );
    expect(feed.map((i) => i.key)).toEqual(['g-g1', 'f-f2', 'g-g2', 'f-f1']);
  });

  it('sorts by name within the same state for a stable order', () => {
    const feed = mergeFeed(
      [friendship('f1', 'Bram', 'your_turn')],
      [group('g1', 'Avond crew', 'your_turn'), group('g2', 'Zondag', 'your_turn')],
    );
    expect(feed.map((i) => i.key)).toEqual(['g-g1', 'f-f1', 'g-g2']);
  });

  it('uses kind-prefixed keys so friendship and group ids can never collide', () => {
    const feed = mergeFeed([friendship('same-id', 'A', 'waiting')], [group('same-id', 'B', 'waiting')]);
    const keys = feed.map((i) => i.key);
    expect(new Set(keys).size).toBe(2);
  });

  it('handles empty inputs', () => {
    expect(mergeFeed([], [])).toEqual([]);
  });
});

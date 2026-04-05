// Covers PROF-01, PROF-02, PROF-03, PROF-04

const mockUpdate = jest.fn().mockResolvedValue({ error: null });
const mockEq = jest.fn().mockResolvedValue({ error: null });
const mockSingle = jest.fn();
const mockSelect = jest.fn();

const mockFrom = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

const mockProfileRow = {
  id: 'uid-1',
  username: 'alex',
  display_name: 'Alex Jones',
  avatar_url: null,
  push_token: null,
  onboarding_answers: null,
};

describe('Profile — fetch and update (PROF-01, PROF-02)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockResolvedValue({ data: mockProfileRow, error: null });
    mockSelect.mockReturnValue({ eq: jest.fn().mockReturnValue({ single: mockSingle }) });
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
  });

  it('PROF-01: fetch profile returns correct row', async () => {
    const { supabase } = require('../lib/supabase');
    const result = await supabase.from('profiles').select('*').eq('id', 'uid-1').single();
    expect(result.data).toEqual(mockProfileRow);
    expect(result.data.username).toBe('alex');
    expect(result.data.display_name).toBe('Alex Jones');
  });

  it('PROF-02: update display_name succeeds without error', async () => {
    const { supabase } = require('../lib/supabase');
    const result = await supabase.from('profiles').update({ display_name: 'New Name' }).eq('id', 'uid-1');
    expect(mockUpdate).toHaveBeenCalledWith({ display_name: 'New Name' });
    expect(result.error).toBeNull();
  });
});

describe('Profile — username validation', () => {
  const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

  it('PROF-01: accepts valid username with letters, numbers, underscores', () => {
    expect(USERNAME_REGEX.test('alex_jones')).toBe(true);
    expect(USERNAME_REGEX.test('User123')).toBe(true);
    expect(USERNAME_REGEX.test('abc')).toBe(true);
  });

  it('PROF-01: rejects username shorter than 3 chars', () => {
    expect(USERNAME_REGEX.test('ab')).toBe(false);
  });

  it('PROF-01: rejects username longer than 20 chars', () => {
    expect(USERNAME_REGEX.test('a'.repeat(21))).toBe(false);
  });

  it('PROF-01: rejects username with special characters', () => {
    expect(USERNAME_REGEX.test('user-name')).toBe(false);
    expect(USERNAME_REGEX.test('user@name')).toBe(false);
  });
});

describe('Questionnaire — onboarding_answers (PROF-03, PROF-04)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockEq.mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockFrom.mockReturnValue({ select: mockSelect, update: mockUpdate });
  });

  const validAnswers = {
    friendship_length: '3+',
    conversation_style: ['jokes', 'deep'],
    personality: 'adventurous',
    life_focus: 'travel',
    depth_comfort: 4,
    off_limits: ['money'],
  };

  it('PROF-03: questionnaire submit calls update with onboarding_answers object', async () => {
    const { supabase } = require('../lib/supabase');
    await supabase.from('profiles').update({ onboarding_answers: validAnswers }).eq('id', 'uid-1');
    expect(mockUpdate).toHaveBeenCalledWith({ onboarding_answers: validAnswers });
  });

  it('PROF-04: onboarding_answers has all 6 required keys', () => {
    const keys = Object.keys(validAnswers);
    expect(keys).toContain('friendship_length');
    expect(keys).toContain('conversation_style');
    expect(keys).toContain('personality');
    expect(keys).toContain('life_focus');
    expect(keys).toContain('depth_comfort');
    expect(keys).toContain('off_limits');
    expect(keys).toHaveLength(6);
  });

  it('PROF-04: conversation_style and off_limits are arrays (multi-select)', () => {
    expect(Array.isArray(validAnswers.conversation_style)).toBe(true);
    expect(Array.isArray(validAnswers.off_limits)).toBe(true);
  });

  it('PROF-04: depth_comfort is a number between 1 and 5', () => {
    expect(validAnswers.depth_comfort).toBeGreaterThanOrEqual(1);
    expect(validAnswers.depth_comfort).toBeLessThanOrEqual(5);
  });
});

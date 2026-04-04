export const MAX_VIDEO_DURATION_SECONDS = 30;

export const QUESTION_CATEGORIES = ['funny', 'deep', 'personal'] as const;
export type QuestionCategory = typeof QUESTION_CATEGORIES[number];

export const STREAK_WARNING_HOURS = 4; // notify when this many hours left to answer

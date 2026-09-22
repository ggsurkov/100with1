export type ThemeOption = 'food' | 'life' | 'relationship' | 'nature' | 'travel' | 'hobby' | 'fun' | 'health' | 'education' | 'shopping' | 'work' | 'misc';
export type MechanicOption = 'object' | 'action' | 'location' | 'person' | 'number' | 'word';
export type RatingOption = 'family' | 'adult' | 'nostalgia';
export type RoundTypeOption = 'simple' | 'blitz' | 'final' | string;

export interface GameRoundSpec {
  roundNumber: number;
  questionCount: number;
  roundType: RoundTypeOption;
}

export interface GenerateGamePayload {
  userLogin: string;
  gameTitle: string;
  gameDescription: string;
  isApllyUsedQuestion: boolean;
  themes: ThemeOption[];
  mechanics: MechanicOption[];
  ratings: RatingOption[];
  gameSpec: GameRoundSpec[];
}

export const THEME_OPTIONS: ThemeOption[] = ['food', 'life', 'relationship', 'nature', 'travel', 'hobby', 'fun', 'health', 'education', 'shopping', 'work', 'misc'];
export const MECHANIC_OPTIONS: MechanicOption[] = ['object', 'action', 'location', 'person', 'number', 'word'];
export const RATING_OPTIONS: RatingOption[] = ['family', 'adult', 'nostalgia'];
export const ROUND_TYPE_OPTIONS: RoundTypeOption[] = ['simple', 'blitz', 'final'];

export const DEFAULT_GAME_SPEC: GameRoundSpec[] = [
  { roundNumber: 1, questionCount: 10, roundType: 'simple' },
  { roundNumber: 2, questionCount: 5, roundType: 'blitz' },
  { roundNumber: 3, questionCount: 1, roundType: 'final' },
];

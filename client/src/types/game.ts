export enum GameTypes {
  GuessPopularity = 'GuessPopularity', // Механика "100 к 1"
}

// Зеркало `RoundTypes` из server/src/models/Game.ts
export enum RoundTypes {
  AnswersShow = 'answersShow',
  AnswersHide = 'answersHide',
}

export const ROUND_TYPE_LABELS: Record<RoundTypes, string> = {
  [RoundTypes.AnswersShow]: 'Ответы видны без процентов',
  [RoundTypes.AnswersHide]: 'Ответы скрыты',
};

export interface Game {
  _id: string;
  title: string;
  description: string;
  type?: GameTypes;
  rounds: any[];
}

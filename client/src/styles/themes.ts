import { GameTypes } from '../types/game';
import themes from './themes.module.scss';

export function themeClassFor(gameType?: GameTypes): string {
  switch (gameType) {
    case GameTypes.GuessPopularity:
    default:
      return themes.themeGuessPopularity;
  }
}

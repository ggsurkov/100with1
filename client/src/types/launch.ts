import { GameTypes } from './game';

export interface TeamGameInfo {
  teamId: string;
  teamPoints: number;
  teamTitle: string;
  capitanActive?: boolean;
  // Per-question score ledger (questionId -> points awarded); teamPoints is
  // always the sum of these values.
  questionScores?: { [questionId: string]: number };
}

export interface Launch {
  _id: string;
  gameId: string;
  joinedTeamIds: string[];
  teamGameInfo: TeamGameInfo[];
  status: 'active' | 'finished';
  currentRoundId?: string;
  gameType: GameTypes;
  finishedAt?: string;
  qrCode?: string;
  qrCodeApp?: string;
  qrCodeLaunch?: string;
  currentQuestionId?: string;
  isTimerActive?: boolean;
}

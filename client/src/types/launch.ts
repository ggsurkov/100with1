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
  completedRoundIds?: string[];
  gameType: GameTypes;
  finishedAt?: string;
  qrCode?: string;
  qrCodeApp?: string;
  qrCodeLaunch?: string;
  qrCodeTelegram?: string;
  currentQuestionId?: string;
  isTimerActive?: boolean;
}

// Captain's "round finished" screen: GET /launches/:id/summary.
export interface CaptainQuestionSummary {
  questionId: string;
  title: string;
  answerText: string | null;
  wasAway: boolean;
}

export interface CaptainRoundSummary {
  roundId: string;
  title: string;
  questions: CaptainQuestionSummary[];
}

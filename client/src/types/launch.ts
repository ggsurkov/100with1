import { GameTypes } from './game';

export interface TeamGameInfo {
  teamId: string;
  teamPoints: number;
  teamTitle: string;
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
}

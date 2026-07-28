import mongoose, { Schema, Document } from 'mongoose';
import { GameTypes } from './Game';

export interface TeamGameInfo {
  teamId: string;
  teamPoints: number;
  teamTitle: string;
  capitanActive?: boolean;
  // Per-question score ledger (questionId -> points awarded). teamPoints must
  // always equal the sum of these values — re-saving a question overwrites its
  // entry instead of adding to teamPoints, keeping "Calculate & Save" idempotent.
  questionScores?: { [questionId: string]: number };
}

export interface ILaunch extends Document {
  gameId: string;
  joinedTeamIds: string[];
  teamGameInfo: TeamGameInfo[];
  status: 'active' | 'finished';
  currentRoundId?: string;
  gameType: GameTypes;
  finishedAt?: Date;
  qrCode?: string;
  qrCodeApp?: string;
  qrCodeLaunch?: string;
  currentQuestionId?: string;
  isTimerActive: boolean;
}

const TeamGameInfoSchema: Schema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  teamPoints: { type: Number, default: 0 },
  teamTitle: { type: String, required: true },
  capitanActive: { type: Boolean, default: false },
  questionScores: { type: Schema.Types.Mixed, default: {} },
});

const LaunchSchema: Schema = new Schema({
  gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  joinedTeamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  teamGameInfo: [TeamGameInfoSchema],
  status: { type: String, enum: ['active', 'finished'], default: 'active' },
  currentRoundId: { type: Schema.Types.ObjectId, ref: 'Round', required: false },
  gameType: { type: String, enum: Object.values(GameTypes), default: GameTypes.GuessPopularity },
  finishedAt: { type: Date, required: false },
  qrCode: { type: String, required: false },
  qrCodeApp: { type: String, required: false },
  qrCodeLaunch: { type: String, required: false },
  currentQuestionId: { type: Schema.Types.ObjectId, required: false },
  isTimerActive: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<ILaunch>('Launch', LaunchSchema);

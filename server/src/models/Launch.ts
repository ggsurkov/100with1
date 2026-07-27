import mongoose, { Schema, Document } from 'mongoose';
import { GameTypes } from './Game';

export interface TeamGameInfo {
  teamId: string;
  teamPoints: number;
  teamTitle: string;
  capitanActive?: boolean;
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
  currentQuestionId?: string;
  isTimerActive: boolean;
}

const TeamGameInfoSchema: Schema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  teamPoints: { type: Number, default: 0 },
  teamTitle: { type: String, required: true },
  capitanActive: { type: Boolean, default: false },
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
  currentQuestionId: { type: Schema.Types.ObjectId, required: false },
  isTimerActive: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model<ILaunch>('Launch', LaunchSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface TeamGameInfo {
  teamId: string;
  teamPoints: number;
  teamTitle: string;
}

export interface ILaunch extends Document {
  gameId: string;
  joinedTeamIds: string[];
  teamGameInfo: TeamGameInfo[];
  status: 'active' | 'finished';
}

const TeamGameInfoSchema: Schema = new Schema({
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  teamPoints: { type: Number, default: 0 },
  teamTitle: { type: String, required: true },
});

const LaunchSchema: Schema = new Schema({
  gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  joinedTeamIds: [{ type: Schema.Types.ObjectId, ref: 'Team' }],
  teamGameInfo: [TeamGameInfoSchema],
  status: { type: String, enum: ['active', 'finished'], default: 'active' },
}, { timestamps: true });

export default mongoose.model<ILaunch>('Launch', LaunchSchema);

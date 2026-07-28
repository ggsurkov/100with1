import mongoose, { Schema, Document } from 'mongoose';

export interface ITeamAnswerEntry {
  roundId: string;
  questionId: string;
  answerText: string;
  updatedAt: Date;
}

export interface ITeamAnswer extends Document {
  launchId: string;
  gameId: string;
  teamId: string;
  answers: ITeamAnswerEntry[];
}

const TeamAnswerEntrySchema: Schema = new Schema({
  roundId: { type: String, required: true },
  questionId: { type: String, required: true },
  answerText: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
}, { _id: false });

const TeamAnswerSchema: Schema = new Schema({
  launchId: { type: Schema.Types.ObjectId, ref: 'Launch', required: true },
  gameId: { type: Schema.Types.ObjectId, ref: 'Game', required: true },
  teamId: { type: Schema.Types.ObjectId, ref: 'Team', required: true },
  answers: [TeamAnswerEntrySchema],
}, { timestamps: true });

export default mongoose.model<ITeamAnswer>('TeamAnswer', TeamAnswerSchema);

import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  title: string;
  description: string;
}

const TeamSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
});

export default mongoose.model<ITeam>('Team', TeamSchema);

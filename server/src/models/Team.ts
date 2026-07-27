import mongoose, { Schema, Document } from 'mongoose';

export interface ITeam extends Document {
  title: string;
  description: string;
  pin: string;
}

export function generateTeamPin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const TeamSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  pin: { type: String, required: true },
});

TeamSchema.pre('validate', function (this: ITeam, next) {
  if (!this.pin) {
    this.pin = generateTeamPin();
  }
  next();
});

export default mongoose.model<ITeam>('Team', TeamSchema);

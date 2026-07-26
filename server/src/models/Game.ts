import mongoose, { Schema, Document } from 'mongoose';

export interface IAnswer {
  text: string;
  hint: string;
  orderNumber: number;
  points: number;
  hide: boolean;
  popularity?: number;
}

export interface IQuestion {
  title: string;
  hint: string;
  timer: number;
  orderNumber: number;
  imageUrl?: string;
  answers: IAnswer[];
}

export interface IRound {
  orderNumber: number;
  type: number;
  hint: string;
  questions: IQuestion[];
}

export interface IGame extends Document {
  title: string;
  description: string;
  rounds: IRound[];
}

const AnswerSchema: Schema = new Schema({
  text: { type: String, required: true },
  hint: { type: String, default: '' },
  orderNumber: { type: Number, required: true },
  points: { type: Number, required: true },
  hide: { type: Boolean, default: true },
  popularity: { type: Number, default: 0, min: 0, max: 100 },
});

const QuestionSchema: Schema = new Schema({
  title: { type: String, required: true },
  hint: { type: String, default: '' },
  timer: { type: Number, default: 60 },
  orderNumber: { type: Number, required: true },
  imageUrl: { type: String, required: false },
  answers: [AnswerSchema],
});

const RoundSchema: Schema = new Schema({
  orderNumber: { type: Number, required: true },
  type: { type: Number, default: 1 },
  hint: { type: String, default: '' },
  questions: [QuestionSchema],
});

const GameSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  rounds: [RoundSchema],
});

export default mongoose.model<IGame>('Game', GameSchema);

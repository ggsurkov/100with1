import mongoose, { Schema, Document } from 'mongoose';

export enum GameTypes {
  GuessPopularity = 'GuessPopularity', // Механика "100 к 1"
}

export enum RoundTypes {
  AnswersShow = 'answersShow', // На старте раунда ведущий показывает тексты ответов без популярности
  AnswersHide = 'answersHide', // На старте раунда ответы не показываются вообще
}

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
  type: RoundTypes;
  hint: string;
  questions: IQuestion[];
}

export interface IGame extends Document {
  title: string;
  description: string;
  type?: GameTypes;
  status: 'active' | 'archived';
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
  type: { type: String, enum: Object.values(RoundTypes), default: RoundTypes.AnswersHide },
  hint: { type: String, default: '' },
  questions: [QuestionSchema],
});

const GameSchema: Schema = new Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: Object.values(GameTypes), default: GameTypes.GuessPopularity },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  rounds: [RoundSchema],
});

export default mongoose.model<IGame>('Game', GameSchema);

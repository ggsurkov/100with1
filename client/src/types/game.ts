export enum GameTypes {
  GuessPopularity = 'GuessPopularity', // Механика "100 к 1"
}

export interface Game {
  _id: string;
  title: string;
  description: string;
  type?: GameTypes;
  rounds: any[];
}

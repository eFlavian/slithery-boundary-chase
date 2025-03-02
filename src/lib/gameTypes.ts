
// Game type definitions

export type Position = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type Player = {
  id: string;
  name: string;
  score: number;
  snake: Position[];
  direction: Direction;
  isPlaying: boolean;
  isHost: boolean;
  isReady: boolean;
  speedBoostPercentage: number;
};

export type Food = {
  x: number;
  y: number;
  type: string;
};

export type Portal = Position;

export type YellowDot = Position;

export type PublicSession = {
  id: string;
  hostName: string;
  players: any[];
};


export type Position = {
  x: number;
  y: number;
};

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export type Player = {
  id: string;
  name: string;
  snake: Position[];
  direction: Direction;
  score: number;
  speedBoostPercentage: number;
  isPlaying: boolean;
  isReady?: boolean;
};

export type Room = {
  id: string;
  name: string;
  players: Player[];
  hostId: string;
  isPublic: boolean;
  maxPlayers: number;
  inProgress: boolean;
};

export type FoodType = 'normal' | 'special';
export type FoodItem = Position & { type: FoodType };

export type GameState = {
  players: Player[];
  foods: FoodItem[];
  yellowDots: Position[];
  portals: Position[];
};

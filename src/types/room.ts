
export type RoomVisibility = 'public' | 'private';

export interface Room {
  id: string;
  name: string;
  visibility: RoomVisibility;
  maxPlayers: number;
  creatorId: string;
  players: RoomPlayer[];
  gameInProgress: boolean;
}

export interface RoomPlayer {
  id: string;
  name: string;
  isReady: boolean;
  isCreator: boolean;
}

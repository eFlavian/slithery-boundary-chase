
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

export interface CreateRoomRequest {
  type: 'createRoom';
  playerId: string;
  playerName: string;
  roomName: string;
  visibility: RoomVisibility;
  maxPlayers: number;
}

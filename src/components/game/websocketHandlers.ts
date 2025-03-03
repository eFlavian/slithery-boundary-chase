
import { toast } from 'sonner';

type WebSocketMessageHandler = (
  message: any, 
  state: {
    setPlayerId: (id: string | null) => void;
    setPlayers: (players: any[]) => void;
    setFoods: (foods: any[]) => void;
    setYellowDots: (dots: any[]) => void;
    setPortals: (portals: any[]) => void;
    setGameOver: (over: boolean) => void;
    setIsPlaying: (playing: boolean) => void;
    setIsMinimapVisible: (visible: boolean) => void;
    setMinimapTimeLeft: (time: number) => void;
    clearTimers: () => void;
    setupMinimapTimers: (duration: number) => void;
    // Room-related handlers
    setRooms: (rooms: any[]) => void;
    setCurrentRoom: (room: any | null) => void;
  }
) => void;

export const handleInitMessage: WebSocketMessageHandler = (message, state) => {
  state.setPlayerId(message.data.playerId);
};

export const handleGameStateMessage: WebSocketMessageHandler = (message, state) => {
  state.setPlayers(message.data.players);
  state.setFoods(message.data.foods);
  state.setYellowDots(message.data.yellowDots || []);
  state.setPortals(message.data.portals || []);
};

export const handlePlayerDeathMessage: WebSocketMessageHandler = (message, state) => {
  toast(message.data.message);
};

export const handleGameOverMessage: WebSocketMessageHandler = (message, state) => {
  state.setGameOver(true);
  state.setIsPlaying(false);
  state.setIsMinimapVisible(false);
  state.clearTimers();
  toast.error(`Game Over! ${message.data.message}`);
  
  // Clear current room if in one
  state.setCurrentRoom(null);
};

export const handleMinimapUpdateMessage: WebSocketMessageHandler = (message, state) => {
  // Clear any existing timers if this is a reset
  if (message.data.reset) {
    state.clearTimers();
  }
  
  state.setIsMinimapVisible(message.data.visible);
  state.setMinimapTimeLeft(message.data.duration);
  
  // Setup new timers
  state.setupMinimapTimers(message.data.duration);
};

export const handleRoomsListMessage: WebSocketMessageHandler = (message, state) => {
  state.setRooms(message.data.rooms);
};

export const handleRoomUpdateMessage: WebSocketMessageHandler = (message, state) => {
  const roomData = message.data.room;
  
  if (roomData) {
    state.setCurrentRoom(roomData);
    
    // If game started in room and we're not playing yet
    // Fixed: Call setIsPlaying instead of accessing isPlaying directly
    if (roomData.inProgress) {
      state.setIsPlaying(true);
      state.setGameOver(false);
    }
  } else {
    // Room might have been deleted
    state.setCurrentRoom(null);
  }
};

export const handleRoomErrorMessage: WebSocketMessageHandler = (message, state) => {
  toast.error(message.data.message);
};

export const handleMessage = (event: MessageEvent, state: Parameters<WebSocketMessageHandler>[1]) => {
  const message = JSON.parse(event.data);

  switch (message.type) {
    case 'init':
      handleInitMessage(message, state);
      break;
    case 'gameState':
      handleGameStateMessage(message, state);
      break;
    case 'playerDeath':
      handlePlayerDeathMessage(message, state);
      break;
    case 'gameOver':
      handleGameOverMessage(message, state);
      break;
    case 'minimapUpdate':
      handleMinimapUpdateMessage(message, state);
      break;
    case 'roomsList':
      handleRoomsListMessage(message, state);
      break;
    case 'roomUpdate':
      handleRoomUpdateMessage(message, state);
      break;
    case 'roomError':
      handleRoomErrorMessage(message, state);
      break;
  }
};

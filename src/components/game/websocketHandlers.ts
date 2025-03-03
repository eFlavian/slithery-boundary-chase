
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
    setGameStatus: (status: 'waiting' | 'countdown' | 'playing' | 'ended') => void;
    setCountdownValue: (value: number) => void;
    setGameTimeLeft: (time: number) => void;
    setBattleRoyaleRadius: (radius: number) => void;
    setBattleRoyaleCenter: (center: {x: number, y: number}) => void;
    clearTimers: () => void;
    setupMinimapTimers: (duration: number) => void;
  }
) => void;

export const handleInitMessage: WebSocketMessageHandler = (message, state) => {
  state.setPlayerId(message.data.playerId);
};

export const handleGameStateMessage: WebSocketMessageHandler = (message, state) => {
  state.setPlayers(message.data.players);
  state.setFoods(message.data.foods);
  state.setYellowDots(message.data.yellowDots || []);
  state.setPortals(message.data.portals);
  
  // Handle game status updates
  if (message.data.gameStatus) {
    const previousStatus = message.data.previousGameStatus;
    const newStatus = message.data.gameStatus;
    
    state.setGameStatus(newStatus);
    
    // If the game just started (changed to 'playing'), show a toast
    if (newStatus === 'playing' && previousStatus !== 'playing') {
      toast.success("GAME STARTED!");
    }
  }
  
  // Handle countdown
  if (message.data.countdownValue !== undefined) {
    state.setCountdownValue(message.data.countdownValue);
  }
  
  // Handle game time left
  if (message.data.gameTimeLeft !== undefined) {
    state.setGameTimeLeft(message.data.gameTimeLeft);
  }
  
  // Handle battle royale zone updates
  if (message.data.battleRoyale) {
    if (message.data.battleRoyale.radius !== undefined) {
      state.setBattleRoyaleRadius(message.data.battleRoyale.radius);
    }
    if (message.data.battleRoyale.center) {
      state.setBattleRoyaleCenter(message.data.battleRoyale.center);
    }
  }
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
  }
};


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
  try {
    // Get all players
    state.setPlayers(message.data.players);
    state.setFoods(message.data.foods);
    state.setYellowDots(message.data.yellowDots || []);
    state.setPortals(message.data.portals);
    
    // Handle game status updates
    if (message.data.gameStatus) {
      const previousStatus = message.data.previousGameStatus;
      const newStatus = message.data.gameStatus;
      
      console.log("Game state update - Previous status:", previousStatus, "New status:", newStatus);
      state.setGameStatus(newStatus);
      
      // Only show the "GAME STARTED!" toast when transitioning from 'countdown' to 'playing'
      if (newStatus === 'playing' && previousStatus === 'countdown') {
        toast.success("GAME STARTED!");
      }
    }
    
    // Handle countdown update in gameState messages as well
    if (message.data.countdownValue !== undefined) {
      console.log("Game state updated countdown value:", message.data.countdownValue);
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
  } catch (error) {
    console.error("Error in handleGameStateMessage:", error);
  }
};

export const handleCountdownMessage: WebSocketMessageHandler = (message, state) => {
  try {
    console.log("Received countdown message:", message);
    
    if (message.data.countdownValue !== undefined) {
      const newValue = message.data.countdownValue;
      console.log("Setting countdown value to:", newValue);
      state.setCountdownValue(newValue);
    }
    
    if (message.data.gameStatus) {
      console.log("Setting game status from countdown message to:", message.data.gameStatus);
      state.setGameStatus(message.data.gameStatus);
    }
  } catch (error) {
    console.error("Error in handleCountdownMessage:", error);
  }
};

export const handlePlayerDeathMessage: WebSocketMessageHandler = (message, state) => {
  try {
    // Only show death message if the game has started
    if (message.data.gameStatus === 'playing') {
      toast(message.data.message);
    }
  } catch (error) {
    console.error("Error in handlePlayerDeathMessage:", error);
  }
};

export const handleGameOverMessage: WebSocketMessageHandler = (message, state) => {
  try {
    state.setGameOver(true);
    state.setIsPlaying(false);
    state.setIsMinimapVisible(false);
    state.clearTimers();
    toast.error(`Game Over! ${message.data.message}`);
  } catch (error) {
    console.error("Error in handleGameOverMessage:", error);
  }
};

export const handleMinimapUpdateMessage: WebSocketMessageHandler = (message, state) => {
  try {
    // Clear any existing timers if this is a reset
    if (message.data.reset) {
      state.clearTimers();
    }
    
    state.setIsMinimapVisible(message.data.visible);
    state.setMinimapTimeLeft(message.data.duration);
    
    // Setup new timers
    state.setupMinimapTimers(message.data.duration);
  } catch (error) {
    console.error("Error in handleMinimapUpdateMessage:", error);
  }
};

export const handleMessage = (event: MessageEvent, state: Parameters<WebSocketMessageHandler>[1]) => {
  try {
    const message = JSON.parse(event.data);
    console.log("Received websocket message:", message.type, message);

    switch (message.type) {
      case 'init':
        handleInitMessage(message, state);
        break;
      case 'gameState':
        handleGameStateMessage(message, state);
        break;
      case 'countdown':
        handleCountdownMessage(message, state);
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
      default:
        console.log("Unhandled message type:", message.type);
        break;
    }
  } catch (error) {
    console.error("Error handling websocket message:", error);
  }
};


import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';
import crypto from 'crypto';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Game state management
const gameState = {
  players: new Map(),
  foods: [],
  yellowDots: [],
  portals: [],
  playerCount: 0
};

// Session management
const sessions = new Map();
const playerSessions = new Map();
const playerConnections = new Map();

// Game constants
const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const INITIAL_YELLOW_DOTS = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;
const YELLOW_DOT_SPAWN_INTERVAL = 60000;
const MINIMAP_DURATION = 20;
const GAME_START_COUNTDOWN = 5;

// Generate a random 6-character session ID (all caps, alphanumeric)
function generateSessionId() {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  };
}

function isPositionOccupied(pos) {
  for (const player of gameState.players.values()) {
    if (player.snake.some(segment => segment.x === pos.x && segment.y === pos.y)) {
      return true;
    }
  }
  
  if (gameState.foods.some(food => food.x === pos.x && food.y === pos.y)) {
    return true;
  }
  
  if (gameState.yellowDots.some(dot => dot.x === pos.x && dot.y === pos.y)) {
    return true;
  }
  
  if (gameState.portals.some(portal => portal.x === pos.x && portal.y === pos.y)) {
    return true;
  }
  
  return false;
}

function getRandomUnoccupiedPosition() {
  let pos;
  do {
    pos = getRandomPosition();
  } while (isPositionOccupied(pos));
  
  return pos;
}

function spawnFood() {
  const foodType = Math.random() < 0.2 ? 'special' : 'normal';
  const position = getRandomUnoccupiedPosition();
  
  gameState.foods.push({
    ...position,
    type: foodType
  });
}

function spawnYellowDot() {
  if (gameState.yellowDots.length < INITIAL_YELLOW_DOTS) {
    const position = getRandomUnoccupiedPosition();
    gameState.yellowDots.push(position);
  }
}

function spawnPortal() {
  const position = getRandomUnoccupiedPosition();
  gameState.portals.push(position);
}

function handleCollision(playerId, newHead) {
  const player = gameState.players.get(playerId);
  if (!player) return { collision: false };

  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    return { 
      collision: true, 
      type: 'suicide',
      message: `${player.name} committed suicide by hitting the wall`
    };
  }

  if (player.snake.slice(1).some(segment => 
    segment.x === newHead.x && segment.y === newHead.y
  )) {
    return { 
      collision: true, 
      type: 'suicide',
      message: `${player.name} committed suicide by eating their own tail`
    };
  }

  for (let [otherId, otherPlayer] of gameState.players.entries()) {
    if (otherId !== playerId && otherPlayer.isPlaying) {
      if (otherPlayer.snake.some(segment => 
        segment.x === newHead.x && segment.y === newHead.y
      )) {
        return { 
          collision: true, 
          type: 'killed',
          message: `${player.name} got killed by ${otherPlayer.name}`
        };
      }
    }
  }

  return { collision: false };
}

// Session management functions
function createGameSession(playerId, playerName) {
  const sessionId = generateSessionId();
  
  const session = {
    id: sessionId,
    players: [{
      id: playerId,
      name: playerName,
      ready: false,
      isHost: true
    }],
    isPrivate: false,
    gameInProgress: false,
    countdownTimer: null,
    countdown: null
  };
  
  sessions.set(sessionId, session);
  playerSessions.set(playerId, sessionId);
  
  return session;
}

function joinGameSession(sessionId, playerId, playerName) {
  const session = sessions.get(sessionId);
  
  if (!session) {
    return { error: 'Session not found' };
  }
  
  if (session.gameInProgress) {
    return { error: 'Game already in progress' };
  }
  
  if (session.isPrivate && session.players.length > 1) {
    return { error: 'Private session is full' };
  }
  
  // Check if player is already in session
  const existingPlayer = session.players.find(p => p.id === playerId);
  if (existingPlayer) {
    return { error: 'You are already in this session' };
  }
  
  session.players.push({
    id: playerId,
    name: playerName,
    ready: false,
    isHost: false
  });
  
  playerSessions.set(playerId, sessionId);
  
  return session;
}

function leaveGameSession(playerId) {
  const sessionId = playerSessions.get(playerId);
  if (!sessionId) return null;
  
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  // Remove player from session
  session.players = session.players.filter(p => p.id !== playerId);
  
  // If no players left, delete the session
  if (session.players.length === 0) {
    if (session.countdownTimer) {
      clearInterval(session.countdownTimer);
    }
    sessions.delete(sessionId);
    playerSessions.delete(playerId);
    return null;
  }
  
  // If host left, assign a new host
  if (!session.players.some(p => p.isHost)) {
    session.players[0].isHost = true;
  }
  
  // If game was about to start, cancel it
  if (session.countdownTimer) {
    clearInterval(session.countdownTimer);
    session.countdownTimer = null;
    session.countdown = null;
  }
  
  playerSessions.delete(playerId);
  return session;
}

function togglePlayerReady(playerId) {
  const sessionId = playerSessions.get(playerId);
  if (!sessionId) return null;
  
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  const player = session.players.find(p => p.id === playerId);
  if (!player) return null;
  
  player.ready = !player.ready;
  
  const allReady = session.players.length > 0 && session.players.every(p => p.ready);
  
  // If all players are ready, start the countdown
  if (allReady && !session.countdownTimer && session.players.length > 1) {
    startGameCountdown(session);
  } else if (!allReady && session.countdownTimer) {
    // If someone unreadies, cancel the countdown
    clearInterval(session.countdownTimer);
    session.countdownTimer = null;
    session.countdown = null;
  }
  
  return session;
}

function toggleSessionPrivacy(playerId) {
  const sessionId = playerSessions.get(playerId);
  if (!sessionId) return null;
  
  const session = sessions.get(sessionId);
  if (!session) return null;
  
  const player = session.players.find(p => p.id === playerId);
  if (!player || !player.isHost) return null;
  
  session.isPrivate = !session.isPrivate;
  return session;
}

function startGameCountdown(session) {
  session.countdown = GAME_START_COUNTDOWN;
  
  // Broadcast countdown started
  broadcastToSession(session.id, {
    type: 'gameStarting',
    data: { countdown: session.countdown }
  });
  
  session.countdownTimer = setInterval(() => {
    session.countdown -= 1;
    
    if (session.countdown <= 0) {
      clearInterval(session.countdownTimer);
      session.countdownTimer = null;
      session.gameInProgress = true;
      
      // Start the game
      startGame(session);
    } else {
      // Update countdown
      broadcastToSession(session.id, {
        type: 'gameStarting',
        data: { countdown: session.countdown }
      });
    }
  }, 1000);
}

function startGame(session) {
  // In a real implementation, we would initialize the game state for all players in the session
  broadcastToSession(session.id, {
    type: 'gameStart',
    data: { message: 'Game starting now!' }
  });
  
  // Initialize players in the game
  for (const player of session.players) {
    const ws = playerConnections.get(player.id);
    if (ws) {
      // Add player to game state with their session name
      const playerId = player.id;
      const spawnPosition = getRandomUnoccupiedPosition();
      
      gameState.players.set(playerId, {
        id: playerId,
        name: player.name,
        snake: [spawnPosition],
        direction: 'RIGHT',
        score: 0,
        speedBoostPercentage: 0,
        isPlaying: true,
        minimapVisible: false,
        minimapTimer: null,
        minimapTimeLeft: 0
      });
      
      // Send init message to player
      ws.send(JSON.stringify({
        type: 'init',
        data: { playerId }
      }));
    }
  }
  
  // Reset the session
  sessions.delete(session.id);
  for (const player of session.players) {
    playerSessions.delete(player.id);
  }
  
  // Broadcast the game state to all players
  broadcastGameState();
}

function broadcastToSession(sessionId, message) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const messageStr = JSON.stringify(message);
  
  for (const player of session.players) {
    const ws = playerConnections.get(player.id);
    if (ws && ws.readyState === 1) {
      ws.send(messageStr);
    }
  }
}

function broadcastSessionUpdate(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const sessionData = {
    sessionId: session.id,
    isPrivate: session.isPrivate,
    countdown: session.countdown,
    players: session.players.map(p => ({
      id: p.id,
      name: p.name,
      ready: p.ready,
      isHost: p.isHost
    }))
  };
  
  for (const player of session.players) {
    const ws = playerConnections.get(player.id);
    if (ws && ws.readyState === 1) {
      ws.send(JSON.stringify({
        type: 'sessionUpdated',
        data: {
          ...sessionData,
          playerId: player.id
        }
      }));
    }
  }
}

function initializeGame() {
  for (let i = 0; i < INITIAL_NORMAL_FOOD; i++) {
    spawnFood();
  }
  
  for (let i = 0; i < INITIAL_PORTAL_COUNT; i++) {
    spawnPortal();
  }

  for (let i = 0; i < INITIAL_YELLOW_DOTS; i++) {
    spawnYellowDot();
  }
  
  setInterval(spawnFood, FOOD_SPAWN_INTERVAL);
  setInterval(spawnPortal, PORTAL_SPAWN_INTERVAL);
  setInterval(spawnYellowDot, YELLOW_DOT_SPAWN_INTERVAL);
}

function broadcastGameState() {
  const playersArray = Array.from(gameState.players.values()).map(player => ({
    id: player.id,
    name: player.name,
    snake: player.snake,
    direction: player.direction,
    score: player.score,
    speedBoostPercentage: player.speedBoostPercentage,
    isPlaying: player.isPlaying,
    minimapVisible: player.minimapVisible,
    minimapTimer: player.minimapTimer
  }));

  const state = {
    players: playersArray,
    foods: gameState.foods,
    yellowDots: gameState.yellowDots,
    portals: gameState.portals
  };

  const stateMsg = JSON.stringify({
    type: 'gameState',
    data: state
  });

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(stateMsg);
    }
  });
}

wss.on('connection', (ws) => {
  const playerId = `player${++gameState.playerCount}`;
  playerConnections.set(playerId, ws);
  
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    
    // Session management messages
    if (data.type === 'createSession') {
      const session = createGameSession(playerId, data.playerName);
      
      ws.send(JSON.stringify({
        type: 'sessionCreated',
        data: {
          sessionId: session.id,
          playerId: playerId,
          players: session.players,
          isPrivate: session.isPrivate,
          countdown: session.countdown
        }
      }));
      
      return;
    }
    
    if (data.type === 'joinSession') {
      const result = joinGameSession(data.sessionId, playerId, data.playerName);
      
      if (result.error) {
        ws.send(JSON.stringify({
          type: 'sessionError',
          data: { message: result.error }
        }));
        return;
      }
      
      ws.send(JSON.stringify({
        type: 'sessionJoined',
        data: {
          sessionId: result.id,
          playerId: playerId,
          players: result.players,
          isPrivate: result.isPrivate,
          countdown: result.countdown
        }
      }));
      
      // Update all players in the session
      broadcastSessionUpdate(result.id);
      
      return;
    }
    
    if (data.type === 'leaveSession') {
      const session = leaveGameSession(playerId);
      
      if (session) {
        broadcastSessionUpdate(session.id);
      }
      
      return;
    }
    
    if (data.type === 'toggleReady') {
      const session = togglePlayerReady(playerId);
      
      if (session) {
        broadcastSessionUpdate(session.id);
      }
      
      return;
    }
    
    if (data.type === 'togglePrivacy') {
      const session = toggleSessionPrivacy(playerId);
      
      if (session) {
        broadcastSessionUpdate(session.id);
      }
      
      return;
    }
    
    if (data.type === 'startGame') {
      const sessionId = playerSessions.get(playerId);
      if (!sessionId) return;
      
      const session = sessions.get(sessionId);
      if (!session) return;
      
      const player = session.players.find(p => p.id === playerId);
      if (!player || !player.isHost) return;
      
      const allReady = session.players.length > 0 && session.players.every(p => p.ready);
      if (!allReady) return;
      
      startGameCountdown(session);
      
      return;
    }
    
    // Game-related messages from this point
    if (data.playerId) {
      const player = gameState.players.get(data.playerId);

      if (!player) return;

      switch (data.type) {
        case 'spawn':
          player.name = data.playerName;
          player.isPlaying = true;
          const newSpawnPos = getRandomUnoccupiedPosition();
          player.snake = [newSpawnPos];
          broadcastGameState();
          break;

        case 'direction':
          if (player.isPlaying) {
            player.direction = data.direction;
          }
          break;

        case 'update':
          if (!player.isPlaying) return;

          const newHead = { ...player.snake[0] };
          
          switch (player.direction) {
            case 'UP': newHead.y -= 1; break;
            case 'DOWN': newHead.y += 1; break;
            case 'LEFT': newHead.x -= 1; break;
            case 'RIGHT': newHead.x += 1; break;
          }

          const collisionResult = handleCollision(data.playerId, newHead);
          
          if (collisionResult.collision) {
            player.isPlaying = false;
            
            if (player.minimapTimer) {
              clearTimeout(player.minimapTimer);
              player.minimapTimer = null;
              player.minimapVisible = false;
            }
            
            wss.clients.forEach(client => {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'playerDeath',
                  data: { 
                    message: collisionResult.message,
                    playerId: data.playerId
                  }
                }));
              }
            });

            ws.send(JSON.stringify({
              type: 'gameOver',
              data: { 
                score: player.score,
                message: collisionResult.message
              }
            }));
            return;
          }

          const newSnake = [newHead, ...player.snake];

          const portalIndex = gameState.portals.findIndex(portal => 
            portal.x === newHead.x && portal.y === newHead.y
          );

          if (portalIndex !== -1) {
            gameState.portals.splice(portalIndex, 1);
            player.speedBoostPercentage = Math.min(
              player.speedBoostPercentage + 25, 
              100
            );
          }

          const yellowDotIndex = gameState.yellowDots.findIndex(dot => 
            dot.x === newHead.x && dot.y === newHead.y
          );

          if (yellowDotIndex !== -1) {
            // Remove the yellow dot
            gameState.yellowDots.splice(yellowDotIndex, 1);
            
            // Always send a fixed duration of 20 seconds (MINIMAP_DURATION)
            // Don't add to existing duration
            ws.send(JSON.stringify({
              type: 'minimapUpdate',
              data: { 
                visible: true,
                duration: MINIMAP_DURATION,
                reset: true // Flag to indicate we should reset any existing timer
              }
            }));
          }

          const foodIndex = gameState.foods.findIndex(food => 
            food.x === newHead.x && food.y === newHead.y
          );

          if (foodIndex !== -1) {
            const food = gameState.foods[foodIndex];
            gameState.foods.splice(foodIndex, 1);
            player.score += food.type === 'special' ? 5 : 1;
            
            if (food.type === 'special') {
              for (let i = 0; i < 4; i++) {
                newSnake.push({ ...newSnake[newSnake.length - 1] });
              }
            }
          } else {
            newSnake.pop();
          }

          player.snake = newSnake;
          break;

        case 'speedBoost':
          if (player.isPlaying) {
            player.speedBoostPercentage = Math.max(0, player.speedBoostPercentage - 0.5);
          }
          break;
      }

      broadcastGameState();
    }
  });

  ws.on('close', () => {
    // Handle session cleanup if the player was in a session
    const sessionId = playerSessions.get(playerId);
    if (sessionId) {
      const session = leaveGameSession(playerId);
      if (session) {
        broadcastSessionUpdate(session.id);
      }
    }
    
    // Handle game cleanup
    const player = gameState.players.get(playerId);
    if (player && player.minimapTimer) {
      clearTimeout(player.minimapTimer);
    }
    gameState.players.delete(playerId);
    playerConnections.delete(playerId);
    broadcastGameState();
  });
});

initializeGame();

server.listen(3001, () => {
  console.log('WebSocket server is running on ws://localhost:3001');
});

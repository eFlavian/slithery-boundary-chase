import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';
import { nanoid } from 'nanoid';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const gameState = {
  players: new Map(),
  foods: [],
  yellowDots: [],
  portals: [],
  playerCount: 0,
  // Session management
  sessions: new Map(),
  clientToPlayer: new Map() // maps WebSocket clients to player IDs
};

const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const INITIAL_YELLOW_DOTS = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;
const YELLOW_DOT_SPAWN_INTERVAL = 60000;
const MINIMAP_DURATION = 20; // Changed from 10 to 20 seconds
const SESSION_CODE_LENGTH = 6; // Length of session codes
const MAX_PLAYERS_PER_SESSION = 10; // Maximum players per session

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
function createGameSession(playerId, isPrivate = false) {
  const player = gameState.players.get(playerId);
  if (!player) return null;
  
  // Generate a unique session ID (6 character alphanumeric code)
  const sessionId = nanoid(SESSION_CODE_LENGTH).toUpperCase();
  
  const newSession = {
    id: sessionId,
    hostId: playerId,
    hostName: player.name,
    players: [{
      id: playerId,
      name: player.name,
      isHost: true,
      isReady: false
    }],
    isPrivate: isPrivate,
    isActive: true,
    startTime: null
  };
  
  // Associate player with this session
  player.sessionId = sessionId;
  
  // Store the session
  gameState.sessions.set(sessionId, newSession);
  
  return sessionId;
}

function joinGameSession(playerId, sessionId) {
  const player = gameState.players.get(playerId);
  const session = gameState.sessions.get(sessionId);
  
  if (!player) return { success: false, message: 'Player not found' };
  if (!session) return { success: false, message: 'Session not found' };
  if (!session.isActive) return { success: false, message: 'Session is no longer active' };
  if (session.players.length >= MAX_PLAYERS_PER_SESSION) {
    return { success: false, message: 'Session is full' };
  }
  
  // Don't allow joining if game has already started
  if (session.startTime) {
    return { success: false, message: 'Game already in progress' };
  }
  
  // Check if player is already in this session
  if (player.sessionId === sessionId) {
    return { success: true };
  }
  
  // Remove player from any existing session
  if (player.sessionId) {
    leaveGameSession(playerId);
  }
  
  // Add player to this session
  session.players.push({
    id: playerId,
    name: player.name,
    isHost: false,
    isReady: false
  });
  
  // Update player's session
  player.sessionId = sessionId;
  
  return { 
    success: true, 
    isHost: session.hostId === playerId,
    isPrivate: session.isPrivate,
    hostName: session.hostName
  };
}

function leaveGameSession(playerId) {
  const player = gameState.players.get(playerId);
  
  if (!player || !player.sessionId) return false;
  
  const sessionId = player.sessionId;
  const session = gameState.sessions.get(sessionId);
  
  if (!session) return false;
  
  // Remove player from session players array
  const playerIndex = session.players.findIndex(p => p.id === playerId);
  if (playerIndex !== -1) {
    session.players.splice(playerIndex, 1);
  }
  
  // Clear player's session
  player.sessionId = null;
  
  // If host leaves, either assign a new host or close the session
  if (session.hostId === playerId) {
    if (session.players.length > 0) {
      // Assign the next player as host
      const newHost = session.players[0];
      session.hostId = newHost.id;
      session.hostName = newHost.name;
      newHost.isHost = true;
    } else {
      // No players left, close the session
      gameState.sessions.delete(sessionId);
      return { closed: true };
    }
  }
  
  return { closed: false, newHost: session.hostId };
}

function setPlayerReadyStatus(playerId, sessionId, isReady) {
  const session = gameState.sessions.get(sessionId);
  if (!session) return null;
  
  const playerInSession = session.players.find(p => p.id === playerId);
  if (!playerInSession) return null;
  
  playerInSession.isReady = isReady;
  
  // Check if all players are ready to start the game
  const allReady = session.players.length > 0 && 
                  session.players.every(player => player.isReady);
  
  return { allReady };
}

function toggleSessionPrivacy(playerId, sessionId) {
  const session = gameState.sessions.get(sessionId);
  
  if (!session || session.hostId !== playerId) return false;
  
  session.isPrivate = !session.isPrivate;
  
  return session.isPrivate;
}

function getPublicSessions() {
  return Array.from(gameState.sessions.values())
    .filter(session => !session.isPrivate && session.isActive && !session.startTime)
    .map(session => ({
      id: session.id,
      hostName: session.hostName,
      players: session.players
    }));
}

function startSessionGame(sessionId) {
  const session = gameState.sessions.get(sessionId);
  if (!session) return;
  
  // Set session as started
  session.startTime = Date.now();
  
  // Set all players in this session to isPlaying
  session.players.forEach(sessionPlayer => {
    const player = gameState.players.get(sessionPlayer.id);
    if (player) {
      // Reset player state for game start
      const spawnPosition = getRandomUnoccupiedPosition();
      player.snake = [spawnPosition];
      player.direction = 'RIGHT';
      player.score = 0;
      player.speedBoostPercentage = 0;
      player.isPlaying = true;
    }
  });
  
  // Broadcast to all clients in this session
  const playersInSession = session.players.map(p => p.id);
  wss.clients.forEach(client => {
    const clientPlayerId = gameState.clientToPlayer.get(client);
    if (client.readyState === 1 && clientPlayerId && playersInSession.includes(clientPlayerId)) {
      client.send(JSON.stringify({
        type: 'gameStarting',
        data: { sessionId }
      }));
    }
  });
}

function broadcastSessionPlayerUpdate(sessionId) {
  const session = gameState.sessions.get(sessionId);
  if (!session) return;
  
  // Get the current session players
  const sessionPlayers = session.players;
  
  // Broadcast to all clients in this session
  const playersInSession = sessionPlayers.map(p => p.id);
  wss.clients.forEach(client => {
    const clientPlayerId = gameState.clientToPlayer.get(client);
    if (client.readyState === 1 && clientPlayerId && playersInSession.includes(clientPlayerId)) {
      client.send(JSON.stringify({
        type: 'sessionPlayerUpdate',
        data: { players: sessionPlayers }
      }));
    }
  });
  
  // Check if all players are ready, and if so, start the game after a short delay
  const allReady = sessionPlayers.length > 0 && sessionPlayers.every(p => p.isReady);
  
  if (allReady && !session.startTime) {
    // Give players a 3-second countdown before starting
    setTimeout(() => {
      startSessionGame(sessionId);
    }, 3000);
  }
}

function broadcastPublicSessionsUpdate() {
  const publicSessions = getPublicSessions();
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'publicSessionsUpdate',
        data: { sessions: publicSessions }
      }));
    }
  });
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
  
  // Periodically broadcast public sessions update
  setInterval(broadcastPublicSessionsUpdate, 5000);
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
  
  // Store client-to-player mapping
  gameState.clientToPlayer.set(ws, playerId);
  
  const spawnPosition = getRandomUnoccupiedPosition();
  
  gameState.players.set(playerId, {
    id: playerId,
    name: `Player ${gameState.playerCount}`,
    snake: [spawnPosition],
    direction: 'RIGHT',
    score: 0,
    speedBoostPercentage: 0,
    isPlaying: false,
    minimapVisible: false,
    minimapTimer: null,
    minimapTimeLeft: 0, // Track time left on minimap
    sessionId: null // Track which session this player belongs to
  });

  ws.send(JSON.stringify({
    type: 'init',
    data: { playerId }
  }));

  broadcastGameState();

  ws.on('message', (message) => {
    const data = JSON.parse(message);
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
        
      // Session management handlers
      case 'createSession':
        const sessionId = createGameSession(data.playerId, data.isPrivate);
        if (sessionId) {
          ws.send(JSON.stringify({
            type: 'sessionCreated',
            data: { 
              sessionId,
              isPrivate: data.isPrivate
            }
          }));
          
          // Broadcast updated public sessions
          broadcastPublicSessionsUpdate();
        }
        break;
        
      case 'joinSession':
        const joinResult = joinGameSession(data.playerId, data.sessionId);
        
        if (joinResult.success) {
          ws.send(JSON.stringify({
            type: 'sessionJoined',
            data: { 
              sessionId: data.sessionId,
              isHost: joinResult.isHost,
              isPrivate: joinResult.isPrivate,
              hostName: joinResult.hostName
            }
          }));
          
          // Broadcast session player update to all in session
          broadcastSessionPlayerUpdate(data.sessionId);
        } else {
          ws.send(JSON.stringify({
            type: 'sessionJoinError',
            data: { message: joinResult.message }
          }));
        }
        break;
        
      case 'leaveSession':
        const leaveResult = leaveGameSession(data.playerId);
        
        if (leaveResult) {
          if (leaveResult.closed) {
            // Session was closed (host left and no players)
            // Nothing more to do
          } else {
            // Broadcast session player update to all remaining in session
            broadcastSessionPlayerUpdate(data.sessionId);
            
            // If there's a new host, notify them
            if (leaveResult.newHost) {
              const newHostClient = Array.from(gameState.clientToPlayer.entries())
                .find(([_, pid]) => pid === leaveResult.newHost)?.[0];
                
              if (newHostClient && newHostClient.readyState === 1) {
                newHostClient.send(JSON.stringify({
                  type: 'becameHost',
                  data: { sessionId: data.sessionId }
                }));
              }
            }
          }
          
          // Broadcast updated public sessions
          broadcastPublicSessionsUpdate();
        }
        break;
        
      case 'setReady':
        const readyResult = setPlayerReadyStatus(data.playerId, data.sessionId, data.isReady);
        
        if (readyResult) {
          // Update all players in the session about this change
          broadcastSessionPlayerUpdate(data.sessionId);
        }
        break;
        
      case 'setSessionPrivacy':
        const isPrivate = toggleSessionPrivacy(data.playerId, data.sessionId);
        
        if (isPrivate !== null) {
          // Broadcast to all in session about privacy change
          const session = gameState.sessions.get(data.sessionId);
          
          if (session) {
            const playersInSession = session.players.map(p => p.id);
            
            wss.clients.forEach(client => {
              const clientPlayerId = gameState.clientToPlayer.get(client);
              if (client.readyState === 1 && clientPlayerId && playersInSession.includes(clientPlayerId)) {
                client.send(JSON.stringify({
                  type: 'privacyChanged',
                  data: { isPrivate }
                }));
              }
            });
            
            // Broadcast updated public sessions if status changed
            broadcastPublicSessionsUpdate();
          }
        }
        break;
        
      case 'getPublicSessions':
        const publicSessions = getPublicSessions();
        
        ws.send(JSON.stringify({
          type: 'publicSessionsUpdate',
          data: { sessions: publicSessions }
        }));
        break;
    }

    broadcastGameState();
  });

  ws.on('close', () => {
    const player = gameState.players.get(playerId);
    
    if (player) {
      // Clear any timers
      if (player.minimapTimer) {
        clearTimeout(player.minimapTimer);
      }
      
      // If player was in a session, remove them
      if (player.sessionId) {
        leaveGameSession(playerId);
        broadcastSessionPlayerUpdate(player.sessionId);
      }
      
      // Remove player
      gameState.players.delete(playerId);
    }
    
    // Remove client-to-player mapping
    gameState.clientToPlayer.delete(ws);
    
    broadcastGameState();
    // Also update public sessions
    broadcastPublicSessionsUpdate();
  });
});

// Install nanoid for generating unique session IDs
try {
  import('nanoid');
} catch (e) {
  console.log('Installing nanoid package...');
  await new Promise((resolve, reject) => {
    const { exec } = require('child_process');
    exec('npm install nanoid', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error installing nanoid: ${error}`);
        reject(error);
        return;
      }
      console.log(`nanoid installed successfully`);
      resolve();
    });
  });
}

initializeGame();

server.listen(3001, () => {
  console.log('WebSocket server is running on ws://localhost:3001');
});

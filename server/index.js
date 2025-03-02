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
  sessions: new Map()
};

const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const INITIAL_YELLOW_DOTS = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;
const YELLOW_DOT_SPAWN_INTERVAL = 60000;
const MINIMAP_DURATION = 20;
const SESSION_CODE_LENGTH = 6;

const connections = new Map();

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

function generateSessionCode() {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

function createGameSession(sessionName, hostId, visibility = 'private') {
  const sessionId = nanoid();
  const sessionCode = generateSessionCode();
  const session = {
    id: sessionId,
    code: sessionCode,
    name: sessionName,
    hostId: hostId,
    players: [{ id: hostId, name: gameState.players.get(hostId)?.name || 'Host', isReady: false }],
    status: 'waiting',
    visibility: visibility,
    createdAt: Date.now()
  };
  
  gameState.sessions.set(sessionId, session);
  
  const player = gameState.players.get(hostId);
  if (player) {
    player.sessionId = sessionId;
  }
  
  return session;
}

function joinGameSession(sessionCode, playerId) {
  const session = Array.from(gameState.sessions.values()).find(s => s.code === sessionCode);
  
  if (!session) {
    return { error: 'Session not found' };
  }
  
  if (session.status === 'playing') {
    return { error: 'Game already in progress' };
  }
  
  const player = gameState.players.get(playerId);
  if (!player) {
    return { error: 'Player not found' };
  }
  
  if (session.players.some(p => p.id === playerId)) {
    return { session }; // Already in session
  }
  
  session.players.push({
    id: playerId,
    name: player.name,
    isReady: false
  });
  
  player.sessionId = session.id;
  
  return { session };
}

function leaveGameSession(sessionId, playerId) {
  const session = gameState.sessions.get(sessionId);
  if (!session) return { error: 'Session not found' };
  
  session.players = session.players.filter(p => p.id !== playerId);
  
  const player = gameState.players.get(playerId);
  if (player) {
    player.sessionId = null;
    player.isPlaying = false;
  }
  
  if (playerId === session.hostId) {
    if (session.players.length > 0) {
      session.hostId = session.players[0].id;
    } else {
      gameState.sessions.delete(sessionId);
      return { closed: true };
    }
  }
  
  if (session.players.length === 0) {
    gameState.sessions.delete(sessionId);
    return { closed: true };
  }
  
  return { session };
}

function togglePlayerReady(sessionId, playerId, isReady) {
  const session = gameState.sessions.get(sessionId);
  if (!session) return { error: 'Session not found' };
  
  const playerIndex = session.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return { error: 'Player not in session' };
  
  session.players[playerIndex].isReady = isReady;
  
  const allReady = session.players.every(p => p.isReady);
  if (allReady && session.players.length > 1) {
    session.status = 'playing';
    
    session.players.forEach(sessionPlayer => {
      const player = gameState.players.get(sessionPlayer.id);
      if (player) {
        player.isPlaying = true;
        player.score = 0;
        const spawnPosition = getRandomUnoccupiedPosition();
        player.snake = [spawnPosition];
      }
    });
    
    return { session, gameStarted: true };
  }
  
  return { session };
}

function toggleSessionVisibility(sessionId, playerId, visibility) {
  const session = gameState.sessions.get(sessionId);
  if (!session) return { error: 'Session not found' };
  
  if (session.hostId !== playerId) {
    return { error: 'Only the host can change visibility' };
  }
  
  session.visibility = visibility;
  return { session };
}

function broadcastToSession(sessionId, message) {
  const session = gameState.sessions.get(sessionId);
  if (!session) return;
  
  session.players.forEach(player => {
    const playerConnection = connections.get(player.id);
    if (playerConnection && playerConnection.readyState === 1) {
      playerConnection.send(JSON.stringify(message));
    }
  });
}

function broadcastGameState() {
  const playersArray = Array.from(gameState.players.values())
    .filter(player => player.isPlaying)
    .map(player => ({
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

  for (const [playerId, connection] of connections.entries()) {
    const player = gameState.players.get(playerId);
    if (player && player.isPlaying && connection.readyState === 1) {
      connection.send(stateMsg);
    }
  }
}

function broadcastSessionsList(playerId) {
  const sessionsArray = Array.from(gameState.sessions.values())
    .filter(session => session.visibility === 'public')
    .map(session => ({
      id: session.id,
      code: session.code,
      name: session.name,
      hostId: session.hostId,
      players: session.players,
      status: session.status,
      visibility: session.visibility
    }));

  const connection = connections.get(playerId);
  if (connection && connection.readyState === 1) {
    connection.send(JSON.stringify({
      type: 'sessionsList',
      data: { sessions: sessionsArray }
    }));
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
  
  setInterval(() => {
    const now = Date.now();
    for (const [sessionId, session] of gameState.sessions.entries()) {
      if (now - session.createdAt > 2 * 60 * 60 * 1000) {
        gameState.sessions.delete(sessionId);
      }
    }
  }, 30 * 60 * 1000);
}

wss.on('connection', (ws) => {
  const playerId = `player${++gameState.playerCount}`;
  
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
    minimapTimeLeft: 0,
    sessionId: null
  });
  
  connections.set(playerId, ws);

  ws.send(JSON.stringify({
    type: 'init',
    data: { playerId }
  }));

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
          
          if (player.sessionId) {
            const session = gameState.sessions.get(player.sessionId);
            if (session) {
              const allPlayersDead = session.players.every(sessionPlayer => {
                const gamePlayer = gameState.players.get(sessionPlayer.id);
                return !gamePlayer || !gamePlayer.isPlaying;
              });
              
              if (allPlayersDead && session.status === 'playing') {
                session.status = 'waiting';
                session.players.forEach(sessionPlayer => {
                  sessionPlayer.isReady = false;
                });
                
                broadcastToSession(session.id, {
                  type: 'sessionUpdated',
                  data: { session }
                });
              }
            }
          }
          
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
          gameState.yellowDots.splice(yellowDotIndex, 1);
          
          ws.send(JSON.stringify({
            type: 'minimapUpdate',
            data: { 
              visible: true,
              duration: MINIMAP_DURATION,
              reset: true
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
        
      case 'createSession':
        const session = createGameSession(data.sessionName, data.playerId, data.visibility);
        ws.send(JSON.stringify({
          type: 'sessionCreated',
          data: { session }
        }));
        break;
        
      case 'joinSession':
        const joinResult = joinGameSession(data.code, data.playerId);
        
        if (joinResult.error) {
          ws.send(JSON.stringify({
            type: 'sessionError',
            data: { message: joinResult.error }
          }));
        } else {
          broadcastToSession(joinResult.session.id, {
            type: 'sessionUpdated',
            data: { session: joinResult.session }
          });
          
          ws.send(JSON.stringify({
            type: 'sessionJoined',
            data: { session: joinResult.session }
          }));
        }
        break;
        
      case 'leaveSession':
        if (!player.sessionId) return;
        
        const leaveResult = leaveGameSession(data.sessionId, data.playerId);
        
        if (leaveResult.error) {
          ws.send(JSON.stringify({
            type: 'sessionError',
            data: { message: leaveResult.error }
          }));
        } else if (leaveResult.closed) {
          ws.send(JSON.stringify({
            type: 'sessionClosed',
            data: { message: 'Session closed' }
          }));
        } else {
          broadcastToSession(data.sessionId, {
            type: 'sessionUpdated',
            data: { session: leaveResult.session }
          });
        }
        break;
        
      case 'toggleReady':
        if (!player.sessionId) return;
        
        const readyResult = togglePlayerReady(data.sessionId, data.playerId, data.isReady);
        
        if (readyResult.error) {
          ws.send(JSON.stringify({
            type: 'sessionError',
            data: { message: readyResult.error }
          }));
        } else {
          ws.send(JSON.stringify({
            type: 'playerReadyChanged',
            data: { 
              playerId: data.playerId,
              isReady: data.isReady 
            }
          }));
          
          broadcastToSession(data.sessionId, {
            type: 'sessionUpdated',
            data: { session: readyResult.session }
          });
        }
        break;
        
      case 'toggleVisibility':
        if (!player.sessionId) return;
        
        const visibilityResult = toggleSessionVisibility(data.sessionId, data.playerId, data.visibility);
        
        if (visibilityResult.error) {
          ws.send(JSON.stringify({
            type: 'sessionError',
            data: { message: visibilityResult.error }
          }));
        } else {
          broadcastToSession(data.sessionId, {
            type: 'sessionUpdated',
            data: { session: visibilityResult.session }
          });
        }
        break;
        
      case 'getSessions':
        broadcastSessionsList(data.playerId);
        break;
    }

    broadcastGameState();
  });

  ws.on('close', () => {
    const player = gameState.players.get(playerId);
    
    if (player) {
      if (player.minimapTimer) {
        clearTimeout(player.minimapTimer);
      }
      
      if (player.sessionId) {
        const leaveResult = leaveGameSession(player.sessionId, playerId);
        if (!leaveResult.error && !leaveResult.closed) {
          broadcastToSession(player.sessionId, {
            type: 'sessionUpdated',
            data: { session: leaveResult.session }
          });
        }
      }
      
      gameState.players.delete(playerId);
    }
    
    connections.delete(playerId);
    
    broadcastGameState();
  });
});

initializeGame();

server.listen(3001, () => {
  console.log('WebSocket server is running on ws://localhost:3001');
});

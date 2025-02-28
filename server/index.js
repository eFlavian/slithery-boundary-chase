
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Game state and sessions storage
const sessions = new Map();
const players = new Map();

const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const INITIAL_YELLOW_DOTS = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;
const YELLOW_DOT_SPAWN_INTERVAL = 60000;
const MINIMAP_DURATION = 20;

// Generate a random 6-character join code
function generateJoinCode() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return code;
}

function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  };
}

function isPositionOccupied(pos, sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;

  for (const playerId of session.players) {
    const player = players.get(playerId);
    if (player && player.snake.some(segment => segment.x === pos.x && segment.y === pos.y)) {
      return true;
    }
  }
  
  if (session.gameState.foods.some(food => food.x === pos.x && food.y === pos.y)) {
    return true;
  }
  
  if (session.gameState.yellowDots.some(dot => dot.x === pos.x && dot.y === pos.y)) {
    return true;
  }
  
  if (session.gameState.portals.some(portal => portal.x === pos.x && portal.y === pos.y)) {
    return true;
  }
  
  return false;
}

function getRandomUnoccupiedPosition(sessionId) {
  let pos;
  do {
    pos = getRandomPosition();
  } while (isPositionOccupied(pos, sessionId));
  
  return pos;
}

function spawnFood(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const foodType = Math.random() < 0.2 ? 'special' : 'normal';
  const position = getRandomUnoccupiedPosition(sessionId);
  
  session.gameState.foods.push({
    ...position,
    type: foodType
  });
}

function spawnYellowDot(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.gameState.yellowDots.length >= INITIAL_YELLOW_DOTS) return;

  const position = getRandomUnoccupiedPosition(sessionId);
  session.gameState.yellowDots.push(position);
}

function spawnPortal(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const position = getRandomUnoccupiedPosition(sessionId);
  session.gameState.portals.push(position);
}

function handleCollision(playerId, newHead, sessionId) {
  const player = players.get(playerId);
  const session = sessions.get(sessionId);
  if (!player || !session) return { collision: false };

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

  for (const otherPlayerId of session.players) {
    if (otherPlayerId !== playerId) {
      const otherPlayer = players.get(otherPlayerId);
      if (otherPlayer && otherPlayer.isPlaying) {
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
  }

  return { collision: false };
}

function initializeGameState() {
  return {
    foods: [],
    yellowDots: [],
    portals: [],
    started: false
  };
}

function initializeSession(hostId, isPublic = true) {
  const sessionId = uuidv4();
  const joinCode = generateJoinCode();
  
  const session = {
    id: sessionId,
    joinCode,
    host: hostId,
    players: [hostId],
    gameState: initializeGameState(),
    isPublic,
    playerReady: new Set([hostId]), // Host is automatically ready
    gameIntervals: null
  };
  
  sessions.set(sessionId, session);
  
  // Update player's session reference
  const player = players.get(hostId);
  if (player) {
    player.sessionId = sessionId;
  }
  
  return session;
}

function startGameForSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session || session.gameState.started) return;
  
  // Initialize game elements
  for (let i = 0; i < INITIAL_NORMAL_FOOD; i++) {
    spawnFood(sessionId);
  }
  
  for (let i = 0; i < INITIAL_PORTAL_COUNT; i++) {
    spawnPortal(sessionId);
  }

  for (let i = 0; i < INITIAL_YELLOW_DOTS; i++) {
    spawnYellowDot(sessionId);
  }
  
  // Set up recurring spawns
  const foodInterval = setInterval(() => spawnFood(sessionId), FOOD_SPAWN_INTERVAL);
  const portalInterval = setInterval(() => spawnPortal(sessionId), PORTAL_SPAWN_INTERVAL);
  const yellowDotInterval = setInterval(() => spawnYellowDot(sessionId), YELLOW_DOT_SPAWN_INTERVAL);
  
  session.gameIntervals = {
    food: foodInterval,
    portal: portalInterval,
    yellowDot: yellowDotInterval
  };
  
  session.gameState.started = true;
  
  // Set all players to playing state
  for (const playerId of session.players) {
    const player = players.get(playerId);
    if (player) {
      player.isPlaying = true;
      const spawnPosition = getRandomUnoccupiedPosition(sessionId);
      player.snake = [spawnPosition];
    }
  }

  // Broadcast game start to all players in session
  broadcastToSession(sessionId, {
    type: 'gameStart',
    data: { message: "Game started!" }
  });
}

function broadcastToSession(sessionId, message) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const messageStr = JSON.stringify(message);
  
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.playerId && session.players.includes(client.playerId)) {
      client.send(messageStr);
    }
  });
}

function broadcastSessionState(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const playersData = [];
  for (const playerId of session.players) {
    const player = players.get(playerId);
    if (player) {
      playersData.push({
        id: player.id,
        name: player.name,
        isReady: session.playerReady.has(playerId)
      });
    }
  }
  
  const sessionData = {
    id: session.id,
    joinCode: session.joinCode,
    host: session.host,
    players: playersData,
    isPublic: session.isPublic,
    gameStarted: session.gameState.started
  };
  
  broadcastToSession(sessionId, {
    type: 'sessionState',
    data: sessionData
  });
}

function broadcastGameState(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const playersArray = [];
  for (const playerId of session.players) {
    const player = players.get(playerId);
    if (player) {
      playersArray.push({
        id: player.id,
        name: player.name,
        snake: player.snake,
        direction: player.direction,
        score: player.score,
        speedBoostPercentage: player.speedBoostPercentage,
        isPlaying: player.isPlaying,
        minimapVisible: player.minimapVisible,
        minimapTimer: player.minimapTimer
      });
    }
  }

  const state = {
    players: playersArray,
    foods: session.gameState.foods,
    yellowDots: session.gameState.yellowDots,
    portals: session.gameState.portals
  };

  broadcastToSession(sessionId, {
    type: 'gameState',
    data: state
  });
}

function getPublicSessions() {
  const publicSessions = [];
  
  for (const [id, session] of sessions.entries()) {
    if (session.isPublic && !session.gameState.started) {
      const playersCount = session.players.length;
      const readyCount = session.playerReady.size;
      
      publicSessions.push({
        id,
        joinCode: session.joinCode,
        playersCount,
        readyCount
      });
    }
  }
  
  return publicSessions;
}

wss.on('connection', (ws) => {
  const playerId = uuidv4();
  ws.playerId = playerId;
  
  // Initialize player
  players.set(playerId, {
    id: playerId,
    name: `Player ${playerId.substring(0, 4)}`,
    snake: [],
    direction: 'RIGHT',
    score: 0,
    speedBoostPercentage: 0,
    isPlaying: false,
    minimapVisible: false,
    minimapTimer: null,
    minimapTimeLeft: 0,
    sessionId: null
  });

  // Send player ID and available public sessions
  ws.send(JSON.stringify({
    type: 'init',
    data: { 
      playerId,
      publicSessions: getPublicSessions()
    }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const player = players.get(data.playerId);
      
      if (!player) return;
      
      const sessionId = player.sessionId;
      const session = sessionId ? sessions.get(sessionId) : null;

      switch (data.type) {
        case 'createSession':
          // Create a new session with the player as host
          const newSession = initializeSession(playerId, data.isPublic);
          
          // Send session information back to the creator
          ws.send(JSON.stringify({
            type: 'sessionCreated',
            data: {
              sessionId: newSession.id,
              joinCode: newSession.joinCode
            }
          }));
          
          broadcastSessionState(newSession.id);
          break;
          
        case 'joinSession':
          // Join an existing session by code
          let targetSession = null;
          
          // Find session with matching join code
          for (const [id, s] of sessions.entries()) {
            if (s.joinCode === data.joinCode && !s.gameState.started) {
              targetSession = s;
              break;
            }
          }
          
          if (targetSession) {
            // Add player to session
            targetSession.players.push(playerId);
            player.sessionId = targetSession.id;
            
            // Notify player of successful join
            ws.send(JSON.stringify({
              type: 'sessionJoined',
              data: {
                sessionId: targetSession.id,
                joinCode: targetSession.joinCode
              }
            }));
            
            broadcastSessionState(targetSession.id);
          } else {
            // Session not found or already started
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: "Session not found or already started." }
            }));
          }
          break;
          
        case 'leaveSession':
          if (session) {
            // Remove player from session
            session.players = session.players.filter(pid => pid !== playerId);
            session.playerReady.delete(playerId);
            player.sessionId = null;
            
            // If host leaves, assign a new host or close session
            if (session.host === playerId) {
              if (session.players.length > 0) {
                session.host = session.players[0];
              } else {
                // Clean up session if no players left
                if (session.gameIntervals) {
                  clearInterval(session.gameIntervals.food);
                  clearInterval(session.gameIntervals.portal);
                  clearInterval(session.gameIntervals.yellowDot);
                }
                sessions.delete(sessionId);
                return;
              }
            }
            
            broadcastSessionState(sessionId);
          }
          break;
          
        case 'toggleReady':
          if (session) {
            if (session.playerReady.has(playerId)) {
              session.playerReady.delete(playerId);
            } else {
              session.playerReady.add(playerId);
            }
            
            // Check if all players are ready to start the game
            if (session.playerReady.size === session.players.length && session.players.length >= 1) {
              startGameForSession(sessionId);
            }
            
            broadcastSessionState(sessionId);
          }
          break;
          
        case 'togglePrivacy':
          if (session && session.host === playerId) {
            session.isPublic = !session.isPublic;
            broadcastSessionState(sessionId);
          }
          break;
          
        case 'getPublicSessions':
          ws.send(JSON.stringify({
            type: 'publicSessions',
            data: getPublicSessions()
          }));
          break;
          
        case 'setName':
          player.name = data.name;
          if (sessionId) {
            broadcastSessionState(sessionId);
          }
          break;

        case 'direction':
          if (player.isPlaying && session && session.gameState.started) {
            player.direction = data.direction;
          }
          break;

        case 'update':
          if (!player.isPlaying || !session || !session.gameState.started) return;

          const newHead = { ...player.snake[0] };
          
          switch (player.direction) {
            case 'UP': newHead.y -= 1; break;
            case 'DOWN': newHead.y += 1; break;
            case 'LEFT': newHead.x -= 1; break;
            case 'RIGHT': newHead.x += 1; break;
          }

          const collisionResult = handleCollision(playerId, newHead, sessionId);
          
          if (collisionResult.collision) {
            player.isPlaying = false;
            
            if (player.minimapTimer) {
              clearTimeout(player.minimapTimer);
              player.minimapTimer = null;
              player.minimapVisible = false;
            }
            
            broadcastToSession(sessionId, {
              type: 'playerDeath',
              data: { 
                message: collisionResult.message,
                playerId: data.playerId
              }
            });

            ws.send(JSON.stringify({
              type: 'gameOver',
              data: { 
                score: player.score,
                message: collisionResult.message
              }
            }));
            
            // Check if game should end (only one or no players left)
            const activePlayers = session.players.filter(pid => {
              const p = players.get(pid);
              return p && p.isPlaying;
            });
            
            if (activePlayers.length <= 1) {
              // Game over - reset session
              session.gameState.started = false;
              session.playerReady.clear();
              
              if (session.gameIntervals) {
                clearInterval(session.gameIntervals.food);
                clearInterval(session.gameIntervals.portal);
                clearInterval(session.gameIntervals.yellowDot);
                session.gameIntervals = null;
              }
              
              session.gameState = initializeGameState();
              
              broadcastToSession(sessionId, {
                type: 'sessionEnd',
                data: { 
                  message: "Game ended! All players can ready up to start a new game."
                }
              });
              
              broadcastSessionState(sessionId);
            }
            
            return;
          }

          const newSnake = [newHead, ...player.snake];

          const portalIndex = session.gameState.portals.findIndex(portal => 
            portal.x === newHead.x && portal.y === newHead.y
          );

          if (portalIndex !== -1) {
            session.gameState.portals.splice(portalIndex, 1);
            player.speedBoostPercentage = Math.min(
              player.speedBoostPercentage + 25, 
              100
            );
          }

          const yellowDotIndex = session.gameState.yellowDots.findIndex(dot => 
            dot.x === newHead.x && dot.y === newHead.y
          );

          if (yellowDotIndex !== -1) {
            session.gameState.yellowDots.splice(yellowDotIndex, 1);
            
            ws.send(JSON.stringify({
              type: 'minimapUpdate',
              data: { 
                visible: true,
                duration: MINIMAP_DURATION,
                reset: true
              }
            }));
          }

          const foodIndex = session.gameState.foods.findIndex(food => 
            food.x === newHead.x && food.y === newHead.y
          );

          if (foodIndex !== -1) {
            const food = session.gameState.foods[foodIndex];
            session.gameState.foods.splice(foodIndex, 1);
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
          if (player.isPlaying && session && session.gameState.started) {
            player.speedBoostPercentage = Math.max(0, player.speedBoostPercentage - 0.5);
          }
          break;
      }

      // Broadcast game state updates if in active session
      if (sessionId && session) {
        if (session.gameState.started) {
          broadcastGameState(sessionId);
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  ws.on('close', () => {
    const player = players.get(playerId);
    if (player) {
      // Clean up player timers
      if (player.minimapTimer) {
        clearTimeout(player.minimapTimer);
      }
      
      // Handle player leaving a session
      const sessionId = player.sessionId;
      if (sessionId) {
        const session = sessions.get(sessionId);
        if (session) {
          session.players = session.players.filter(pid => pid !== playerId);
          session.playerReady.delete(playerId);
          
          if (session.players.length === 0) {
            // Clean up empty session
            if (session.gameIntervals) {
              clearInterval(session.gameIntervals.food);
              clearInterval(session.gameIntervals.portal);
              clearInterval(session.gameIntervals.yellowDot);
            }
            sessions.delete(sessionId);
          } else if (session.host === playerId) {
            // Assign new host
            session.host = session.players[0];
            broadcastSessionState(sessionId);
          } else {
            broadcastSessionState(sessionId);
          }
        }
      }
      
      // Remove player
      players.delete(playerId);
    }
  });
});

// Add route to serve session information via HTTP API if needed
app.get('/api/sessions/public', (req, res) => {
  res.json(getPublicSessions());
});

server.listen(3001, () => {
  console.log('WebSocket server is running on ws://localhost:3001');
});

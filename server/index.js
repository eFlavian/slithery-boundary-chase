
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

// Sessions management
const sessions = new Map(); // Store active game sessions
const clientToSession = new Map(); // Map clients to their sessions
const sessionCodes = new Map(); // Map session codes to session IDs for faster lookup

// Game state per session
const getNewGameState = () => ({
  players: new Map(),
  foods: [],
  yellowDots: [],
  portals: [],
  playerCount: 0,
  isActive: false, // indicates if the game is currently running
  readyPlayers: new Set(), // track players who are ready
});

const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const INITIAL_YELLOW_DOTS = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;
const YELLOW_DOT_SPAWN_INTERVAL = 60000;
const MINIMAP_DURATION = 20; // Changed from 10 to 20 seconds

// Helper functions for game mechanics
function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  };
}

function isPositionOccupied(pos, sessionId) {
  const gameState = sessions.get(sessionId);
  if (!gameState) return true;
  
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

function getRandomUnoccupiedPosition(sessionId) {
  let pos;
  do {
    pos = getRandomPosition();
  } while (isPositionOccupied(pos, sessionId));
  
  return pos;
}

function spawnFood(sessionId) {
  const gameState = sessions.get(sessionId);
  if (!gameState || !gameState.isActive) return;
  
  const foodType = Math.random() < 0.2 ? 'special' : 'normal';
  const position = getRandomUnoccupiedPosition(sessionId);
  
  gameState.foods.push({
    ...position,
    type: foodType
  });
}

function spawnYellowDot(sessionId) {
  const gameState = sessions.get(sessionId);
  if (!gameState || !gameState.isActive) return;
  
  if (gameState.yellowDots.length < INITIAL_YELLOW_DOTS) {
    const position = getRandomUnoccupiedPosition(sessionId);
    gameState.yellowDots.push(position);
  }
}

function spawnPortal(sessionId) {
  const gameState = sessions.get(sessionId);
  if (!gameState || !gameState.isActive) return;
  
  const position = getRandomUnoccupiedPosition(sessionId);
  gameState.portals.push(position);
}

function handleCollision(sessionId, playerId, newHead) {
  const gameState = sessions.get(sessionId);
  if (!gameState) return { collision: true };
  
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

function initializeGame(sessionId) {
  const gameState = sessions.get(sessionId);
  if (!gameState) return;
  
  gameState.isActive = true;
  
  // Clear existing data
  gameState.foods = [];
  gameState.yellowDots = [];
  gameState.portals = [];
  
  // Initialize food and items
  for (let i = 0; i < INITIAL_NORMAL_FOOD; i++) {
    spawnFood(sessionId);
  }
  
  for (let i = 0; i < INITIAL_PORTAL_COUNT; i++) {
    spawnPortal(sessionId);
  }

  for (let i = 0; i < INITIAL_YELLOW_DOTS; i++) {
    spawnYellowDot(sessionId);
  }
  
  // Set up spawn intervals for this session
  const sessionIntervals = {
    food: setInterval(() => spawnFood(sessionId), FOOD_SPAWN_INTERVAL),
    portal: setInterval(() => spawnPortal(sessionId), PORTAL_SPAWN_INTERVAL),
    yellowDot: setInterval(() => spawnYellowDot(sessionId), YELLOW_DOT_SPAWN_INTERVAL)
  };
  
  // Store intervals with the session for cleanup
  gameState.intervals = sessionIntervals;
  
  // Reset ready status
  gameState.readyPlayers.clear();
}

function createSession(hostId, hostName) {
  // Generate a unique 6-character session code
  let sessionCode;
  do {
    sessionCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  } while (sessionCodes.has(sessionCode));
  
  const sessionId = uuidv4();
  const newSession = {
    id: sessionId,
    code: sessionCode,
    hostId: hostId,
    hostName: hostName,
    createdAt: Date.now(),
    ...getNewGameState()
  };
  
  sessions.set(sessionId, newSession);
  sessionCodes.set(sessionCode, sessionId); // Map code to ID for lookup
  
  console.log(`Session created: ${sessionId} with code ${sessionCode} by ${hostName} (${hostId})`);
  return newSession;
}

function joinSession(sessionCode, clientId) {
  // Find session by code using the map lookup
  const sessionId = sessionCodes.get(sessionCode);
  if (!sessionId) {
    console.log(`Session not found with code: ${sessionCode}`);
    return null;
  }
  
  const session = sessions.get(sessionId);
  if (!session) {
    console.log(`Session with ID ${sessionId} not found (code mismatch?)`);
    sessionCodes.delete(sessionCode); // Clean up invalid mapping
    return null;
  }
  
  // Map this client to the session
  clientToSession.set(clientId, session.id);
  console.log(`Client ${clientId} joined session ${sessionId} with code ${sessionCode}`);
  return session;
}

function cleanupSession(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  // Clear all intervals
  if (session.intervals) {
    clearInterval(session.intervals.food);
    clearInterval(session.intervals.portal);
    clearInterval(session.intervals.yellowDot);
  }
  
  // Remove player mappings
  for (const playerId of session.players.keys()) {
    clientToSession.delete(playerId);
  }
  
  // Remove from code map
  if (session.code) {
    sessionCodes.delete(session.code);
  }
  
  // Delete the session
  sessions.delete(sessionId);
  console.log(`Session ${sessionId} (code: ${session.code}) was cleaned up`);
}

function broadcastToSession(sessionId, message) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const messageString = JSON.stringify(message);
  
  wss.clients.forEach(client => {
    if (client.readyState === 1 && client.id && clientToSession.get(client.id) === sessionId) {
      client.send(messageString);
    }
  });
}

function broadcastGameState(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return;
  
  const playersArray = Array.from(session.players.values()).map(player => ({
    id: player.id,
    name: player.name,
    snake: player.snake,
    direction: player.direction,
    score: player.score,
    speedBoostPercentage: player.speedBoostPercentage,
    isPlaying: player.isPlaying,
    minimapVisible: player.minimapVisible,
    minimapTimer: player.minimapTimer,
    isReady: session.readyPlayers.has(player.id)
  }));

  const state = {
    players: playersArray,
    foods: session.foods,
    yellowDots: session.yellowDots,
    portals: session.portals,
    isActive: session.isActive,
    hostId: session.hostId,
    code: session.code
  };

  broadcastToSession(sessionId, {
    type: 'gameState',
    data: state
  });
}

// Check if all players in a session are ready
function checkAllPlayersReady(sessionId) {
  const session = sessions.get(sessionId);
  if (!session) return false;
  
  // If no players, not ready
  if (session.players.size === 0) return false;
  
  // Check if all players are marked as ready
  for (const playerId of session.players.keys()) {
    if (!session.readyPlayers.has(playerId)) {
      return false;
    }
  }
  
  return true;
}

// Handle player connection
wss.on('connection', (ws) => {
  const clientId = uuidv4();
  ws.id = clientId;
  
  console.log(`Client connected: ${clientId}`);
  
  ws.send(JSON.stringify({
    type: 'init',
    data: { clientId }
  }));

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      
      // Get the session this client belongs to
      const sessionId = clientToSession.get(clientId);
      let session = sessionId ? sessions.get(sessionId) : null;
      
      switch (data.type) {
        case 'createSession':
          const newSession = createSession(clientId, data.playerName);
          clientToSession.set(clientId, newSession.id);
          
          ws.send(JSON.stringify({
            type: 'sessionCreated',
            data: {
              sessionId: newSession.id,
              sessionCode: newSession.code,
              hostId: newSession.hostId
            }
          }));
          
          // Add host as the first player
          newSession.players.set(clientId, {
            id: clientId,
            name: data.playerName,
            snake: [getRandomUnoccupiedPosition(newSession.id)],
            direction: 'RIGHT',
            score: 0,
            speedBoostPercentage: 0,
            isPlaying: false,
            minimapVisible: false,
            minimapTimer: null,
            minimapTimeLeft: 0
          });
          
          broadcastGameState(newSession.id);
          break;
          
        case 'joinSession':
          const joinedSession = joinSession(data.sessionCode, clientId);
          
          if (joinedSession) {
            ws.send(JSON.stringify({
              type: 'sessionJoined',
              data: {
                sessionId: joinedSession.id,
                sessionCode: joinedSession.code,
                hostId: joinedSession.hostId,
                hostName: joinedSession.hostName
              }
            }));
            
            // Add player to the session
            joinedSession.players.set(clientId, {
              id: clientId,
              name: data.playerName,
              snake: [getRandomUnoccupiedPosition(joinedSession.id)],
              direction: 'RIGHT',
              score: 0,
              speedBoostPercentage: 0,
              isPlaying: false,
              minimapVisible: false,
              minimapTimer: null,
              minimapTimeLeft: 0
            });
            
            broadcastGameState(joinedSession.id);
          } else {
            ws.send(JSON.stringify({
              type: 'error',
              data: { message: 'Session not found' }
            }));
          }
          break;
        
        case 'toggleReady':
          if (!session) return;
          
          if (data.isReady) {
            session.readyPlayers.add(clientId);
          } else {
            session.readyPlayers.delete(clientId);
          }
          
          broadcastGameState(sessionId);
          
          // If all players are ready and there are at least 2 players, start the game
          if (checkAllPlayersReady(sessionId) && session.players.size >= 1) {
            // Start game after 3 seconds
            broadcastToSession(sessionId, {
              type: 'gameStarting',
              data: { countdown: 3 }
            });
            
            setTimeout(() => {
              if (sessions.has(sessionId)) {
                for (const player of session.players.values()) {
                  player.isPlaying = true;
                  // Reset player's position
                  player.snake = [getRandomUnoccupiedPosition(sessionId)];
                  player.score = 0;
                  player.speedBoostPercentage = 0;
                }
                
                initializeGame(sessionId);
                broadcastToSession(sessionId, { type: 'gameStarted' });
                broadcastGameState(sessionId);
              }
            }, 3000);
          }
          break;
        
        case 'startGame':
          if (!session || session.hostId !== clientId || session.isActive) return;
          
          // Force start game (host only)
          broadcastToSession(sessionId, {
            type: 'gameStarting',
            data: { countdown: 3 }
          });
          
          setTimeout(() => {
            if (sessions.has(sessionId)) {
              for (const player of session.players.values()) {
                player.isPlaying = true;
                // Reset player's position
                player.snake = [getRandomUnoccupiedPosition(sessionId)];
                player.score = 0;
                player.speedBoostPercentage = 0;
              }
              
              initializeGame(sessionId);
              broadcastToSession(sessionId, { type: 'gameStarted' });
              broadcastGameState(sessionId);
            }
          }, 3000);
          break;
        
        case 'leaveSession':
          if (!session) return;
          
          // Remove player from session
          session.players.delete(clientId);
          session.readyPlayers.delete(clientId);
          clientToSession.delete(clientId);
          
          // If host leaves, assign a new host or delete the session
          if (session.hostId === clientId) {
            const remainingPlayers = Array.from(session.players.keys());
            if (remainingPlayers.length > 0) {
              // Assign new host
              const newHostId = remainingPlayers[0];
              session.hostId = newHostId;
              session.hostName = session.players.get(newHostId).name;
              
              broadcastToSession(sessionId, {
                type: 'hostChanged',
                data: { 
                  hostId: newHostId,
                  hostName: session.hostName
                }
              });
            } else {
              // No players left, clean up session
              cleanupSession(sessionId);
              return;
            }
          }
          
          broadcastGameState(sessionId);
          break;
          
        case 'direction':
          if (!session || !session.players.has(clientId)) return;
          
          const player = session.players.get(clientId);
          player.direction = data.direction;
          break;

        case 'update':
          if (!session || !session.players.has(clientId) || !session.isActive) return;
          
          const currentPlayer = session.players.get(clientId);
          if (!currentPlayer.isPlaying) return;
          
          const newHead = { ...currentPlayer.snake[0] };
          
          switch (currentPlayer.direction) {
            case 'UP': newHead.y -= 1; break;
            case 'DOWN': newHead.y += 1; break;
            case 'LEFT': newHead.x -= 1; break;
            case 'RIGHT': newHead.x += 1; break;
          }

          const collisionResult = handleCollision(sessionId, clientId, newHead);
          
          if (collisionResult.collision) {
            currentPlayer.isPlaying = false;
            
            if (currentPlayer.minimapTimer) {
              clearTimeout(currentPlayer.minimapTimer);
              currentPlayer.minimapTimer = null;
              currentPlayer.minimapVisible = false;
            }
            
            broadcastToSession(sessionId, {
              type: 'playerDeath',
              data: { 
                message: collisionResult.message,
                playerId: clientId
              }
            });

            ws.send(JSON.stringify({
              type: 'gameOver',
              data: { 
                score: currentPlayer.score,
                message: collisionResult.message
              }
            }));
            
            // Check if this was the last player
            const activePlayers = Array.from(session.players.values())
              .filter(p => p.isPlaying);
              
            if (activePlayers.length <= 1) {
              // Game over - either no players left or just 1 winner
              const winner = activePlayers[0];
              
              if (winner) {
                broadcastToSession(sessionId, {
                  type: 'gameWinner',
                  data: {
                    playerId: winner.id,
                    playerName: winner.name,
                    score: winner.score
                  }
                });
                
                // Set winning player to not playing
                winner.isPlaying = false;
              }
              
              // Reset the game state but keep players
              session.isActive = false;
              
              // Clear intervals
              if (session.intervals) {
                clearInterval(session.intervals.food);
                clearInterval(session.intervals.portal);
                clearInterval(session.intervals.yellowDot);
              }
              
              // Reset ready status for next game
              session.readyPlayers.clear();
              broadcastGameState(sessionId);
            }
            
            return;
          }

          const newSnake = [newHead, ...currentPlayer.snake];

          const portalIndex = session.portals.findIndex(portal => 
            portal.x === newHead.x && portal.y === newHead.y
          );

          if (portalIndex !== -1) {
            session.portals.splice(portalIndex, 1);
            currentPlayer.speedBoostPercentage = Math.min(
              currentPlayer.speedBoostPercentage + 25, 
              100
            );
          }

          const yellowDotIndex = session.yellowDots.findIndex(dot => 
            dot.x === newHead.x && dot.y === newHead.y
          );

          if (yellowDotIndex !== -1) {
            // Remove the yellow dot
            session.yellowDots.splice(yellowDotIndex, 1);
            
            // Send minimap visibility update
            ws.send(JSON.stringify({
              type: 'minimapUpdate',
              data: { 
                visible: true,
                duration: MINIMAP_DURATION,
                reset: true
              }
            }));
          }

          const foodIndex = session.foods.findIndex(food => 
            food.x === newHead.x && food.y === newHead.y
          );

          if (foodIndex !== -1) {
            const food = session.foods[foodIndex];
            session.foods.splice(foodIndex, 1);
            currentPlayer.score += food.type === 'special' ? 5 : 1;
            
            if (food.type === 'special') {
              for (let i = 0; i < 4; i++) {
                newSnake.push({ ...newSnake[newSnake.length - 1] });
              }
            }
          } else {
            newSnake.pop();
          }

          currentPlayer.snake = newSnake;
          break;

        case 'speedBoost':
          if (!session || !session.players.has(clientId) || !session.isActive) return;
          
          const boostingPlayer = session.players.get(clientId);
          if (boostingPlayer.isPlaying) {
            boostingPlayer.speedBoostPercentage = Math.max(0, boostingPlayer.speedBoostPercentage - 0.5);
          }
          break;
          
        case 'listSessions':
          // Return list of sessions with basic info
          const activeSessions = Array.from(sessions.values())
            .filter(s => !s.isActive && s.players.size < 10) // Only show joinable sessions
            .map(s => ({
              code: s.code,
              hostName: s.hostName,
              playerCount: s.players.size
            }));
            
          ws.send(JSON.stringify({
            type: 'sessionList',
            data: { sessions: activeSessions }
          }));
          break;
      }
      
      // Broadcast updated game state if in a session
      if (sessionId && sessions.has(sessionId)) {
        broadcastGameState(sessionId);
      }
    } catch (err) {
      console.error('Error processing message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    
    // Get session for this client
    const sessionId = clientToSession.get(clientId);
    if (sessionId) {
      const session = sessions.get(sessionId);
      if (session) {
        // Remove player from session
        session.players.delete(clientId);
        session.readyPlayers.delete(clientId);
        
        // If this was the host, assign a new host or clean up session
        if (session.hostId === clientId) {
          const remainingPlayers = Array.from(session.players.keys());
          if (remainingPlayers.length > 0) {
            // Assign new host
            const newHostId = remainingPlayers[0];
            session.hostId = newHostId;
            session.hostName = session.players.get(newHostId).name;
            
            broadcastToSession(sessionId, {
              type: 'hostChanged',
              data: { 
                hostId: newHostId,
                hostName: session.hostName
              }
            });
          } else {
            // No players left, clean up session
            cleanupSession(sessionId);
            return;
          }
        }
        
        // If game is active, check if this was the last player
        if (session.isActive) {
          const activePlayers = Array.from(session.players.values())
            .filter(p => p.isPlaying);
            
          if (activePlayers.length <= 1) {
            // Game over - either no players left or just 1 winner
            const winner = activePlayers[0];
            
            if (winner) {
              broadcastToSession(sessionId, {
                type: 'gameWinner',
                data: {
                  playerId: winner.id,
                  playerName: winner.name,
                  score: winner.score
                }
              });
              
              // Set winning player to not playing
              winner.isPlaying = false;
            }
            
            // Reset the game state but keep players
            session.isActive = false;
            
            // Clear intervals
            if (session.intervals) {
              clearInterval(session.intervals.food);
              clearInterval(session.intervals.portal);
              clearInterval(session.intervals.yellowDot);
            }
            
            // Reset ready status for next game
            session.readyPlayers.clear();
          }
        }
        
        broadcastGameState(sessionId);
      }
    }
    
    // Remove client mappings
    clientToSession.delete(clientId);
  });
});

// Periodically clean up old inactive sessions
setInterval(() => {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    // Delete sessions older than 1 hour if not active
    if (!session.isActive && (now - session.createdAt > 60 * 60 * 1000)) {
      cleanupSession(sessionId);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes

server.listen(3001, () => {
  console.log('WebSocket server is running on ws://localhost:3001');
});

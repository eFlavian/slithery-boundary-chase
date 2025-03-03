
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';

const app = express();

// Add CORS headers for all requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

const server = createServer(app);

// Configure WebSocket server with ping/pong for connection stability
const wss = new WebSocketServer({ 
  server,
  // Set a 30 second timeout
  clientTracking: true,
  perMessageDeflate: {
    zlibDeflateOptions: {
      chunkSize: 1024,
      memLevel: 7,
      level: 3
    },
    zlibInflateOptions: {
      chunkSize: 10 * 1024
    },
    concurrencyLimit: 10,
    threshold: 1024
  }
});

// Set up a heartbeat mechanism to keep connections alive
function heartbeat() {
  this.isAlive = true;
}

// Constants
const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const INITIAL_YELLOW_DOTS = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;
const YELLOW_DOT_SPAWN_INTERVAL = 60000;
const MINIMAP_DURATION = 20;
const COUNTDOWN_START_VALUE = 20;
const BROADCAST_INTERVAL = 1000;
const CONCURRENT_PLAYERS_REQUIRED = 2;

// Game state
const gameState = {
  players: new Map(),
  foods: [],
  yellowDots: [],
  portals: [],
  playerCount: 0,
  gameStatus: 'waiting',
  countdownValue: COUNTDOWN_START_VALUE,
  countdownInterval: null,
  gameTimeLeft: 120
};

// Helper functions
function getRandomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  };
}

function isPositionOccupied(pos) {
  // Check players
  for (const player of gameState.players.values()) {
    if (player.snake.some(segment => segment.x === pos.x && segment.y === pos.y)) {
      return true;
    }
  }
  
  // Check other game elements
  return gameState.foods.some(food => food.x === pos.x && food.y === pos.y) ||
         gameState.yellowDots.some(dot => dot.x === pos.x && dot.y === pos.y) ||
         gameState.portals.some(portal => portal.x === pos.x && portal.y === pos.y);
}

function getRandomUnoccupiedPosition() {
  let pos;
  let attempts = 0;
  const MAX_ATTEMPTS = 100;
  
  do {
    pos = getRandomPosition();
    attempts++;
    // Prevent infinite loop if grid is too crowded
    if (attempts > MAX_ATTEMPTS) {
      console.log("Warning: Grid may be too crowded to find unoccupied position");
      return pos;
    }
  } while (isPositionOccupied(pos));
  
  return pos;
}

// Game object spawning
function spawnFood() {
  if (gameState.foods.length >= INITIAL_NORMAL_FOOD + INITIAL_SPECIAL_FOOD) return;
  
  const foodType = Math.random() < 0.2 ? 'special' : 'normal';
  const position = getRandomUnoccupiedPosition();
  
  gameState.foods.push({
    ...position,
    type: foodType
  });
}

function spawnYellowDot() {
  if (gameState.yellowDots.length >= INITIAL_YELLOW_DOTS) return;
  
  const position = getRandomUnoccupiedPosition();
  gameState.yellowDots.push(position);
}

function spawnPortal() {
  if (gameState.portals.length >= INITIAL_PORTAL_COUNT) return;
  
  const position = getRandomUnoccupiedPosition();
  gameState.portals.push(position);
}

// Collision detection
function handleCollision(playerId, newHead, gameStatus) {
  const player = gameState.players.get(playerId);
  if (!player) return { collision: false };

  if (gameStatus !== 'playing') {
    return { collision: false };
  }

  // Wall collision
  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    return { 
      collision: true, 
      type: 'suicide',
      message: `${player.name} committed suicide by hitting the wall`
    };
  }

  // Self collision
  if (player.snake.slice(1).some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
    return { 
      collision: true, 
      type: 'suicide',
      message: `${player.name} committed suicide by eating their own tail`
    };
  }

  // Other player collision
  for (const [otherId, otherPlayer] of gameState.players.entries()) {
    if (otherId !== playerId && otherPlayer.isPlaying) {
      if (otherPlayer.snake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
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

// Game state management
function startCountdown() {
  if (gameState.countdownInterval) {
    clearInterval(gameState.countdownInterval);
  }
  
  gameState.countdownValue = COUNTDOWN_START_VALUE;
  gameState.gameStatus = 'waiting';
  
  broadcastCountdown();
  
  gameState.countdownInterval = setInterval(() => {
    gameState.countdownValue -= 1;
    
    if (gameState.countdownValue === 10) {
      console.log("Switching to countdown mode");
      gameState.gameStatus = 'countdown';
      broadcastGameState();
    }
    
    broadcastCountdown();
    
    if (gameState.countdownValue <= 0) {
      clearInterval(gameState.countdownInterval);
      gameState.countdownInterval = null;
      
      gameState.gameStatus = 'playing';
      console.log("Game starting - countdown finished");
      
      broadcastGameState();
    }
  }, 1000);
}

// Broadcasting functions
function broadcastCountdown() {
  const countdownMsg = JSON.stringify({
    type: 'countdown',
    data: {
      countdownValue: gameState.countdownValue,
      gameStatus: gameState.gameStatus
    }
  });
  
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(countdownMsg);
    }
  });
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
    portals: gameState.portals,
    gameStatus: gameState.gameStatus,
    countdownValue: gameState.countdownValue,
    gameTimeLeft: gameState.gameTimeLeft
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

function initializeGame() {
  // Spawn initial game objects
  for (let i = 0; i < INITIAL_NORMAL_FOOD; i++) {
    spawnFood();
  }
  
  for (let i = 0; i < INITIAL_PORTAL_COUNT; i++) {
    spawnPortal();
  }

  for (let i = 0; i < INITIAL_YELLOW_DOTS; i++) {
    spawnYellowDot();
  }
  
  // Set up spawn intervals
  setInterval(spawnFood, FOOD_SPAWN_INTERVAL);
  setInterval(spawnPortal, PORTAL_SPAWN_INTERVAL);
  setInterval(spawnYellowDot, YELLOW_DOT_SPAWN_INTERVAL);
}

function checkGameConditions() {
  const activePlayers = Array.from(gameState.players.values()).filter(p => p.isPlaying);
  const hasEnoughPlayers = activePlayers.length >= CONCURRENT_PLAYERS_REQUIRED;
  
  if (hasEnoughPlayers && gameState.gameStatus === 'waiting' && !gameState.countdownInterval) {
    console.log("Starting countdown - we have enough players");
    startCountdown();
  }
  
  if (!hasEnoughPlayers && gameState.countdownInterval && gameState.gameStatus !== 'playing') {
    console.log("Cancelling countdown - not enough players");
    clearInterval(gameState.countdownInterval);
    gameState.countdownInterval = null;
    gameState.countdownValue = COUNTDOWN_START_VALUE;
    gameState.gameStatus = 'waiting';
    
    broadcastCountdown();
    broadcastGameState();
  }
}

// WebSocket connection handlers
wss.on('connection', (ws) => {
  console.log("New client connected");
  
  // Set up heartbeat for this connection
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  
  const playerId = `player${++gameState.playerCount}`;
  const spawnPosition = getRandomUnoccupiedPosition();
  
  // Initialize player
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
    minimapTimeLeft: 0
  });

  // Store the playerId on the WebSocket object for reference
  ws.playerId = playerId;

  // Send initial data to new player
  try {
    ws.send(JSON.stringify({
      type: 'init',
      data: { playerId }
    }));
  } catch (error) {
    console.error("Error sending init message:", error);
  }

  broadcastGameState();

  // Message handler
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const player = gameState.players.get(data.playerId);

      if (!player) return;

      switch (data.type) {
        case 'spawn':
          player.name = data.playerName;
          player.isPlaying = true;
          player.snake = [getRandomUnoccupiedPosition()];
          
          checkGameConditions();
          broadcastGameState();
          break;

        case 'direction':
          if (player.isPlaying) {
            player.direction = data.direction;
            if (data.gameStatus) {
              gameState.gameStatus = data.gameStatus;
            }
          }
          break;

        case 'update':
          if (!player.isPlaying) return;

          const newHead = { ...player.snake[0] };
          
          // Move head based on direction
          switch (player.direction) {
            case 'UP': newHead.y -= 1; break;
            case 'DOWN': newHead.y += 1; break;
            case 'LEFT': newHead.x -= 1; break;
            case 'RIGHT': newHead.x += 1; break;
          }

          // Check for collisions
          const collisionResult = handleCollision(data.playerId, newHead, data.gameStatus || gameState.gameStatus);
          
          if (collisionResult.collision) {
            player.isPlaying = false;
            
            if (player.minimapTimer) {
              clearTimeout(player.minimapTimer);
              player.minimapTimer = null;
              player.minimapVisible = false;
            }
            
            // Notify all clients about player death
            wss.clients.forEach(client => {
              if (client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'playerDeath',
                  data: { 
                    message: collisionResult.message,
                    playerId: data.playerId,
                    gameStatus: gameState.gameStatus
                  }
                }));
              }
            });

            // Notify player about game over
            ws.send(JSON.stringify({
              type: 'gameOver',
              data: { 
                score: player.score,
                message: collisionResult.message
              }
            }));
            return;
          }

          // Update snake position
          const newSnake = [newHead, ...player.snake];

          // Check for portal
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

          // Check for yellow dot
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

          // Check for food
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
            newSnake.pop(); // Remove tail if no food was eaten
          }

          player.snake = newSnake;
          break;

        case 'speedBoost':
          if (player.isPlaying) {
            player.speedBoostPercentage = Math.max(0, player.speedBoostPercentage - 0.5);
          }
          break;
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  // Handle disconnection
  ws.on('close', () => {
    const player = gameState.players.get(playerId);
    if (player && player.minimapTimer) {
      clearTimeout(player.minimapTimer);
    }
    gameState.players.delete(playerId);
    
    checkGameConditions();
    broadcastGameState();
  });
});

// Initialize game and set up regular broadcasts
initializeGame();

// Set up broadcast interval
setInterval(() => {
  checkGameConditions();
  broadcastGameState();
}, BROADCAST_INTERVAL);

// Set up ping interval to detect dead connections
const pingInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) {
      console.log("Terminating dead connection", ws.playerId);
      // Handle player cleanup
      if (ws.playerId && gameState.players.has(ws.playerId)) {
        const player = gameState.players.get(ws.playerId);
        if (player && player.minimapTimer) {
          clearTimeout(player.minimapTimer);
        }
        gameState.players.delete(ws.playerId);
        checkGameConditions();
      }
      return ws.terminate();
    }
    
    ws.isAlive = false;
    try {
      ws.ping(() => {});
    } catch (error) {
      console.error("Error sending ping:", error);
    }
  });
}, 30000); // Check every 30 seconds

// Clean up the ping interval when the server closes
wss.on('close', () => {
  clearInterval(pingInterval);
});

// Start server with proper error handling
server.listen(3001, '0.0.0.0', () => {
  console.log('WebSocket server is running on ws://0.0.0.0:3001');
  
  // Log when the server starts listening
  console.log('Server environment:', {
    NODE_ENV: process.env.NODE_ENV,
    PORT: 3001,
    host: '0.0.0.0'
  });
}).on('error', (error) => {
  console.error('Error starting server:', error);
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

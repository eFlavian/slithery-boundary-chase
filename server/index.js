
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const gameState = {
  players: new Map(),
  foods: [],
  portals: [],
  playerCount: 0
};

const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;

function generateRandomPosition() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE)
  };
}

function isPositionOccupied(pos) {
  // Check if any player occupies this position
  for (let player of gameState.players.values()) {
    if (player.snake.some(segment => segment.x === pos.x && segment.y === pos.y)) {
      return true;
    }
  }
  
  // Check if any food occupies this position
  if (gameState.foods.some(food => food.x === pos.x && food.y === pos.y)) {
    return true;
  }
  
  // Check if any portal occupies this position
  return gameState.portals.some(portal => portal.x === pos.x && portal.y === pos.y);
}

function generateFood() {
  let newFood;
  do {
    newFood = generateRandomPosition();
  } while (isPositionOccupied(newFood));

  return {
    ...newFood,
    type: Math.random() < 0.2 ? 'special' : 'normal'
  };
}

function generatePortal() {
  let newPortal;
  do {
    newPortal = generateRandomPosition();
  } while (isPositionOccupied(newPortal));
  
  return newPortal;
}

function initializeGame() {
  // Initialize foods
  gameState.foods = [];
  for (let i = 0; i < INITIAL_NORMAL_FOOD; i++) {
    gameState.foods.push({ ...generateFood(), type: 'normal' });
  }
  for (let i = 0; i < INITIAL_SPECIAL_FOOD; i++) {
    gameState.foods.push({ ...generateFood(), type: 'special' });
  }

  // Initialize portals
  gameState.portals = [];
  for (let i = 0; i < INITIAL_PORTAL_COUNT; i++) {
    gameState.portals.push(generatePortal());
  }
}

function broadcastGameState() {
  const playersArray = Array.from(gameState.players.values());
  const state = {
    players: playersArray,
    foods: gameState.foods,
    portals: gameState.portals
  };

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({
        type: 'gameState',
        data: state
      }));
    }
  });
}

function handleCollision(playerId, newHead) {
  const player = gameState.players.get(playerId);
  if (!player) return { collision: false };

  // Check wall collision
  if (newHead.x < 0 || newHead.x >= GRID_SIZE || newHead.y < 0 || newHead.y >= GRID_SIZE) {
    return { 
      collision: true, 
      type: 'suicide',
      message: `${player.name} committed suicide by hitting the wall`
    };
  }

  // Check self collision // 4 is more pretty (not so harsh)
  if (player.snake.slice(1).some(segment => 
    segment.x === newHead.x && segment.y === newHead.y
  )) {
    return { 
      collision: true, 
      type: 'suicide',
      message: `${player.name} committed suicide by eating their own tail`
    };
  }

  // Check collision with other players
  for (let [otherId, otherPlayer] of gameState.players.entries()) {
    if (otherId !== playerId) {
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

initializeGame();

// Spawn new food periodically
setInterval(() => {
  gameState.foods.push(generateFood());
  broadcastGameState();
}, FOOD_SPAWN_INTERVAL);

// Spawn new portals periodically
setInterval(() => {
  gameState.portals.push(generatePortal());
  broadcastGameState();
}, PORTAL_SPAWN_INTERVAL);

wss.on('connection', (ws) => {
  const playerId = `player${++gameState.playerCount}`;
  
  // Initialize player with isPlaying flag set to false
  gameState.players.set(playerId, {
    id: playerId,
    name: `Player ${gameState.playerCount}`,
    snake: [{ x: 128, y: 128 }],
    direction: 'RIGHT',
    score: 0,
    speedBoostPercentage: 0,
    isPlaying: false // Player starts as inactive
  });

  // Send initial player ID
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
        // Update player state when they spawn
        player.name = data.playerName;
        player.isPlaying = true;
        broadcastGameState();
        break;

      case 'direction':
        if (player.isPlaying) { // Only update direction if player is active
          player.direction = data.direction;
        }
        break;

      case 'update':
        if (!player.isPlaying) return; // Skip updates for inactive players

        const newHead = { ...player.snake[0] };
        
        switch (player.direction) {
          case 'UP': newHead.y -= 1; break;
          case 'DOWN': newHead.y += 1; break;
          case 'LEFT': newHead.x -= 1; break;
          case 'RIGHT': newHead.x += 1; break;
        }

        const collisionResult = handleCollision(data.playerId, newHead);
        
        if (collisionResult.collision) {
          player.isPlaying = false; // Set player as inactive when they die
          
          // Broadcast death message to all clients
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

          // Send game over to the dead player
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

        // Check portal collision
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

        // Check food collision
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
  });

  ws.on('close', () => {
    gameState.players.delete(playerId);
    broadcastGameState();
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
});

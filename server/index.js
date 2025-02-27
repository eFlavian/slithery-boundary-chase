import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const gameState = {
  players: new Map(),
  foods: [],
  yellowDots: [],
  portals: [],
  playerCount: 0
};

const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const INITIAL_YELLOW_DOTS = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;
const YELLOW_DOT_SPAWN_INTERVAL = 60000;

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
    minimapTimer: null
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
          gameState.yellowDots.splice(yellowDotIndex, 1);
          
          ws.send(JSON.stringify({
            type: 'minimapUpdate',
            data: { 
              visible: true,
              duration: 10,
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
    }

    broadcastGameState();
  });

  ws.on('close', () => {
    const player = gameState.players.get(playerId);
    if (player && player.minimapTimer) {
      clearTimeout(player.minimapTimer);
    }
    gameState.players.delete(playerId);
    broadcastGameState();
  });
});

initializeGame();

server.listen(3001, () => {
  console.log('WebSocket server is running on ws://localhost:3001');
});

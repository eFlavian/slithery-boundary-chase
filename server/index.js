import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import express from 'express';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = 3001;

const gameState = {
  players: new Map(),
  foods: [],
  portals: []
};

const GRID_SIZE = 256;

const generateFoodPosition = () => {
  let position;
  do {
    position = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  } while (isCollidingWithSnake(position));
  return position;
};

const isCollidingWithSnake = (position) => {
  for (const player of gameState.players.values()) {
    for (const segment of player.snake) {
      if (segment.x === position.x && segment.y === position.y) {
        return true;
      }
    }
  }
  return false;
};

const spawnFood = () => {
  const foodType = Math.random() < 0.2 ? 'special' : 'normal';
  const food = {
    x: generateFoodPosition().x,
    y: generateFoodPosition().y,
    type: foodType
  };
  gameState.foods.push(food);
  if (gameState.foods.length > 5) {
    gameState.foods.shift();
  }
};

const spawnPortal = () => {
  let position1, position2;
  do {
    position1 = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
    position2 = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE)
    };
  } while (isCollidingWithSnake(position1) || isCollidingWithSnake(position2));

  gameState.portals = [position1, position2];
};

setInterval(spawnFood, 3000);
setInterval(spawnPortal, 10000);

wss.on('connection', ws => {
  const playerId = generatePlayerId();
  console.log('Client connected', playerId);
  ws.playerId = playerId;

  ws.send(JSON.stringify({
    type: 'init',
    data: { playerId }
  }));

  gameState.players.set(playerId, {
    id: playerId,
    name: 'Player',
    snake: [{ x: 128, y: 128 }],
    direction: 'RIGHT',
    score: 0,
    speedBoostPercentage: 100,
    isPlaying: false
  });

  ws.on('message', message => {
    try {
      const parsedMessage = JSON.parse(message.toString());

      switch (parsedMessage.type) {
        case 'spawn':
          const playerName = parsedMessage.playerName;
          gameState.players.set(playerId, {
            id: playerId,
            name: playerName,
            snake: [{ x: 128, y: 128 }],
            direction: 'RIGHT',
            score: 0,
            speedBoostPercentage: 100,
            isPlaying: true
          });
          break;

        case 'direction':
          const direction = parsedMessage.direction;
          gameState.players.set(playerId, {
            ...gameState.players.get(playerId),
            direction: direction
          });
          break;

        case 'update':
          if (!gameState.players.get(playerId).isPlaying) return;
          const player = gameState.players.get(playerId);
          const newHead = getNewHeadPosition(player);
          const collisionResult = handleCollision(playerId, newHead);

          if (collisionResult.collision) {
            gameState.players.set(playerId, {
              ...gameState.players.get(playerId),
              isPlaying: false
            });
            
            wss.clients.forEach(client => {
              client.send(JSON.stringify({
                type: 'playerDeath',
                data: { message: `${player.name} died!` }
              }));
            });

            ws.send(JSON.stringify({
              type: 'gameOver',
              data: { message: collisionResult.message }
            }));
            return;
          }

          const ateFood = collisionResult.ate;

          player.snake.unshift(newHead);
          if (!ateFood) {
            player.snake.pop();
          }

          gameState.players.set(playerId, player);
          break;

        case 'speedBoost':
          const playerBoost = gameState.players.get(playerId);
          if (playerBoost.speedBoostPercentage > 0) {
            playerBoost.speedBoostPercentage = Math.max(0, playerBoost.speedBoostPercentage - 1);
            gameState.players.set(playerId, playerBoost);
          }
          break;
      }
    } catch (error) {
      console.error("Failed to parse message from client", error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected', playerId);
    gameState.players.delete(playerId);
  });
});

function getNewHeadPosition(player) {
  const currentHead = player.snake[0];
  let newHead = { x: currentHead.x, y: currentHead.y };

  switch (player.direction) {
    case 'UP':
      newHead.y = (currentHead.y - 1 + GRID_SIZE) % GRID_SIZE;
      break;
    case 'DOWN':
      newHead.y = (currentHead.y + 1) % GRID_SIZE;
      break;
    case 'LEFT':
      newHead.x = (currentHead.x - 1 + GRID_SIZE) % GRID_SIZE;
      break;
    case 'RIGHT':
      newHead.x = (currentHead.x + 1) % GRID_SIZE;
      break;
  }

  if (gameState.portals.length === 2) {
    const [portal1, portal2] = gameState.portals;
    if (newHead.x === portal1.x && newHead.y === portal1.y) {
      newHead = portal2;
    } else if (newHead.x === portal2.x && newHead.y === portal2.y) {
      newHead = portal1;
    }
  }

  return newHead;
}

const handleCollision = (playerId, newHead) => {
  const player = gameState.players.get(playerId);
  
  // Check wall collision
  if (newHead.x < 0 || newHead.x >= 256 || newHead.y < 0 || newHead.y >= 256) {
    return {
      collision: true,
      message: `${player.name} hit a wall!`
    };
  }

  // Check collision with other snakes
  for (const [otherPlayerId, otherPlayer] of gameState.players) {
    // Skip if it's the same player or if the other player is inactive
    if (otherPlayerId === playerId || !otherPlayer.isPlaying) continue;

    // Check collision with other snake's body
    for (const segment of otherPlayer.snake) {
      if (newHead.x === segment.x && newHead.y === segment.y) {
        return {
          collision: true,
          message: `${player.name} collided with ${otherPlayer.name}!`
        };
      }
    }
  }

  // Check self-collision
  for (let i = 0; i < player.snake.length; i++) {
    if (newHead.x === player.snake[i].x && newHead.y === player.snake[i].y) {
      return {
        collision: true,
        message: `${player.name} collided with themselves!`
      };
    }
  }

  // Check food collision and handle accordingly
  for (let i = 0; i < gameState.foods.length; i++) {
    if (newHead.x === gameState.foods[i].x && newHead.y === gameState.foods[i].y) {
      player.score += gameState.foods[i].type === 'special' ? 5 : 1;
      if (gameState.foods[i].type === 'special') {
        player.speedBoostPercentage = Math.min(100, player.speedBoostPercentage + 25);
      }
      gameState.foods.splice(i, 1);
      spawnFood();
      return { collision: false, ate: true };
    }
  }

  return { collision: false, ate: false };
};

function generatePlayerId() {
  return Math.random().toString(36).substring(2, 15);
}

setInterval(() => {
  const gameStateData = {
    players: Array.from(gameState.players.values()),
    foods: gameState.foods,
    portals: gameState.portals
  };

  wss.clients.forEach(client => {
    client.send(JSON.stringify({
      type: 'gameState',
      data: gameStateData
    }));
  });
}, 50);

server.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});

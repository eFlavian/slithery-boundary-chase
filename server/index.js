
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

const rooms = new Map();
const playerRooms = new Map();

const GRID_SIZE = 256;
const INITIAL_NORMAL_FOOD = 100;
const INITIAL_SPECIAL_FOOD = 30;
const INITIAL_PORTAL_COUNT = 5;
const INITIAL_YELLOW_DOTS = 5;
const FOOD_SPAWN_INTERVAL = 5000;
const PORTAL_SPAWN_INTERVAL = 20000;
const YELLOW_DOT_SPAWN_INTERVAL = 60000;
const MINIMAP_DURATION = 20;

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

function broadcastPublicRooms() {
  const publicRoomsArray = Array.from(rooms.values())
    .filter(room => room.isPublic)
    .map(room => ({
      id: room.id,
      name: room.name,
      playerCount: room.players.length,
      maxPlayers: room.maxPlayers,
      isPublic: room.isPublic,
      host: room.host.name
    }));

  const roomsMsg = JSON.stringify({
    type: 'publicRooms',
    data: { rooms: publicRoomsArray }
  });

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(roomsMsg);
    }
  });
}

function broadcastRoomUpdate(roomId) {
  const roomToUpdate = rooms.get(roomId);
  if (!roomToUpdate) return;
  
  const allPlayersReady = roomToUpdate.players.length > 1 && 
    roomToUpdate.players.every(player => player.isReady || player.isHost);
  
  const updateMsg = JSON.stringify({
    type: 'roomUpdate',
    data: {
      roomId: roomToUpdate.id,
      players: roomToUpdate.players,
      allPlayersReady
    }
  });
  
  roomToUpdate.players.forEach(player => {
    const playerData = gameState.players.get(player.id);
    if (playerData && playerData.ws && playerData.ws.readyState === 1) {
      playerData.ws.send(updateMsg);
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

  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(stateMsg);
    }
  });
}

function createUniqueRoomId() {
  return 'room_' + Math.random().toString(36).substring(2, 9);
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
    ws: ws
  });

  ws.send(JSON.stringify({
    type: 'init',
    data: { playerId }
  }));

  broadcastGameState();
  
  setTimeout(() => {
    broadcastPublicRooms();
  }, 1000);

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      const player = gameState.players.get(data.playerId);

      if (!player) return;

      switch (data.type) {
        case 'ping':
          ws.send(JSON.stringify({
            type: 'pong',
            data: { timestamp: Date.now() }
          }));
          break;

        case 'createRoom':
          console.log(`Player ${data.playerId} creating room: ${data.roomName}`);
          
          const roomId = createUniqueRoomId();
          const newRoom = {
            id: roomId,
            name: data.roomName,
            isPublic: data.isPublic,
            maxPlayers: data.maxPlayers || 8,
            host: player,
            players: [{
              id: player.id,
              name: player.name,
              isReady: false,
              isHost: true
            }],
            isGameStarted: false
          };
          
          rooms.set(roomId, newRoom);
          playerRooms.set(player.id, roomId);
          
          ws.send(JSON.stringify({
            type: 'roomCreated',
            data: {
              roomId: roomId,
              roomName: data.roomName,
              isPublic: data.isPublic,
              players: newRoom.players
            }
          }));
          
          console.log(`Room created: ${roomId} - ${data.roomName}`);
          
          if (data.isPublic) {
            broadcastPublicRooms();
          }
          break;

        case 'joinRoom':
          const roomToJoin = rooms.get(data.roomId);
          if (!roomToJoin) {
            ws.send(JSON.stringify({
              type: 'roomError',
              data: { message: 'Room not found' }
            }));
            return;
          }
          
          if (roomToJoin.players.length >= roomToJoin.maxPlayers) {
            ws.send(JSON.stringify({
              type: 'roomError',
              data: { message: 'Room is full' }
            }));
            return;
          }
          
          if (roomToJoin.isGameStarted) {
            ws.send(JSON.stringify({
              type: 'roomError',
              data: { message: 'Game already started' }
            }));
            return;
          }
          
          const playerInfo = {
            id: player.id,
            name: player.name,
            isReady: false,
            isHost: false
          };
          
          roomToJoin.players.push(playerInfo);
          playerRooms.set(player.id, data.roomId);
          
          ws.send(JSON.stringify({
            type: 'roomJoined',
            data: {
              roomId: data.roomId,
              roomName: roomToJoin.name,
              isPublic: roomToJoin.isPublic,
              isHost: false,
              players: roomToJoin.players
            }
          }));
          
          roomToJoin.players.forEach(p => {
            if (p.id !== player.id) {
              const playerSocket = gameState.players.get(p.id)?.ws;
              if (playerSocket && playerSocket.readyState === 1) {
                playerSocket.send(JSON.stringify({
                  type: 'playerJoined',
                  data: {
                    roomId: data.roomId,
                    playerId: player.id,
                    playerName: player.name
                  }
                }));
              }
            }
          });
          
          broadcastRoomUpdate(data.roomId);
          
          if (roomToJoin.isPublic) {
            broadcastPublicRooms();
          }
          break;

        case 'leaveRoom':
          const playerRoomId = playerRooms.get(player.id);
          if (!playerRoomId) return;
          
          const currentRoom = rooms.get(playerRoomId);
          if (!currentRoom) return;
          
          const playerIndex = currentRoom.players.findIndex(p => p.id === player.id);
          if (playerIndex !== -1) {
            currentRoom.players.splice(playerIndex, 1);
          }
          
          playerRooms.delete(player.id);
          
          ws.send(JSON.stringify({
            type: 'roomLeft',
            data: { roomId: playerRoomId }
          }));
          
          if (currentRoom.players.length === 0) {
            rooms.delete(playerRoomId);
          } else if (player.id === currentRoom.host.id) {
            currentRoom.host = gameState.players.get(currentRoom.players[0].id);
            currentRoom.players[0].isHost = true;
            
            const newHostSocket = gameState.players.get(currentRoom.players[0].id)?.ws;
            if (newHostSocket && newHostSocket.readyState === 1) {
              newHostSocket.send(JSON.stringify({
                type: 'hostTransferred',
                data: { roomId: playerRoomId }
              }));
            }
          }
          
          currentRoom.players.forEach(p => {
            const playerSocket = gameState.players.get(p.id)?.ws;
            if (playerSocket && playerSocket.readyState === 1) {
              playerSocket.send(JSON.stringify({
                type: 'playerLeft',
                data: {
                  roomId: playerRoomId,
                  playerId: player.id,
                  playerName: player.name
                }
              }));
            }
          });
          
          if (currentRoom.players.length > 0) {
            broadcastRoomUpdate(playerRoomId);
          }
          
          if (currentRoom.isPublic) {
            broadcastPublicRooms();
          }
          break;

        case 'toggleReady':
          const readyRoomId = data.roomId;
          const readyRoom = rooms.get(readyRoomId);
          if (!readyRoom) return;
          
          const playerInRoom = readyRoom.players.find(p => p.id === player.id);
          if (!playerInRoom) return;
          
          playerInRoom.isReady = data.isReady;
          
          broadcastRoomUpdate(readyRoomId);
          break;

        case 'startGame':
          const gameRoomId = data.roomId;
          const gameRoom = rooms.get(gameRoomId);
          
          if (!gameRoom || player.id !== gameRoom.host.id) return;
          
          const allReady = gameRoom.players.length > 1 && 
            gameRoom.players.every(p => p.isReady || p.isHost);
          
          if (!allReady) return;
          
          gameRoom.isGameStarted = true;
          
          gameRoom.players.forEach(p => {
            const playerSocket = gameState.players.get(p.id)?.ws;
            if (playerSocket && playerSocket.readyState === 1) {
              playerSocket.send(JSON.stringify({
                type: 'gameStarting',
                data: { roomId: gameRoomId }
              }));
            }
          });
          
          if (gameRoom.isPublic) {
            broadcastPublicRooms();
          }
          break;

        case 'getPublicRooms':
          broadcastPublicRooms();
          break;

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
      }

      broadcastGameState();
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    const player = gameState.players.get(playerId);
    if (!player) return;
    
    if (player.minimapTimer) {
      clearTimeout(player.minimapTimer);
    }
    
    const roomId = playerRooms.get(playerId);
    if (roomId) {
      const roomToLeave = rooms.get(roomId);
      if (roomToLeave) {
        const playerIndex = roomToLeave.players.findIndex(p => p.id === playerId);
        if (playerIndex !== -1) {
          roomToLeave.players.splice(playerIndex, 1);
        }
        
        if (roomToLeave.players.length === 0) {
          rooms.delete(roomId);
        } else if (player.id === roomToLeave.host.id) {
          roomToLeave.host = gameState.players.get(roomToLeave.players[0].id);
          roomToLeave.players[0].isHost = true;
          
          const newHostSocket = gameState.players.get(roomToLeave.players[0].id)?.ws;
          if (newHostSocket && newHostSocket.readyState === 1) {
            newHostSocket.send(JSON.stringify({
              type: 'hostTransferred',
              data: { roomId }
            }));
          }
        }
        
        roomToLeave.players.forEach(p => {
          const playerSocket = gameState.players.get(p.id)?.ws;
          if (playerSocket && playerSocket.readyState === 1) {
            playerSocket.send(JSON.stringify({
              type: 'playerLeft',
              data: {
                roomId,
                playerId,
                playerName: player.name
              }
            }));
          }
        });
        
        if (roomToLeave.players.length > 0) {
          broadcastRoomUpdate(roomId);
        }
        
        if (roomToLeave.isPublic) {
          broadcastPublicRooms();
        }
      }
      
      playerRooms.delete(playerId);
    }
    
    gameState.players.delete(playerId);
    broadcastGameState();
  });
});

initializeGame();

server.listen(3001, () => {
  console.log('WebSocket server is running on ws://localhost:3001');
});

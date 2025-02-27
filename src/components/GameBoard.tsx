<lov-code>
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Sun, Moon, Play, Trophy, Zap, Map } from 'lucide-react';
import { useTheme } from 'next-themes';

type Position = {
  x: number;
  y: number;
};

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
type FoodType = 'normal' | 'special';

type FoodItem = Position & { type: FoodType };
type Portal = Position;
type YellowDot = Position;

const GRID_SIZE = 256;
const CELL_SIZE = 15;
const INITIAL_SPEED = 140;
const CAMERA_SMOOTHING = 0.55;
const MIN_SNAKE_OPACITY = 0.3;
const MINIMAP_SIZE = 150;
const INACTIVE_PLAYER_OPACITY = 0.2;

const GameBoard: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [players, setPlayers] = useState<any[]>([]);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [yellowDots, setYellowDots] = useState<YellowDot[]>([]);
  const [portals, setPortals] = useState<Portal[]>([]);
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameOver, setGameOver] = useState(false);
  const [isSpeedBoostActive, setIsSpeedBoostActive] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMinimapVisible, setIsMinimapVisible] = useState(false);
  const [minimapTimeLeft, setMinimapTimeLeft] = useState(0);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const gameLoop = useRef<number>();
  const lastKeyPress = useRef(0);
  const cameraPositionRef = useRef({ x: 0, y: 0 });
  const lastUpdateTime = useRef(0);
  const animationFrameRef = useRef<number>();
  const minimapTimerRef = useRef<number>();
  const minimapBlinkRef = useRef<number>();
  const reconnectTimerRef = useRef<number>();
  const countdownIntervalRef = useRef<number>();

  const connectToServer = () => {
    // Fix for mobile: Use the current hostname instead of hardcoded localhost
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = window.location.hostname === 'localhost' ? 'localhost:3001' : window.location.host;
    const wsUrl = `${protocol}//${wsHost}`;
    
    console.log(`Connecting to WebSocket server at: ${wsUrl}`);
    
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to server');
      toast.success('Connected to game server');
      setReconnectAttempts(0);
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'init':
          setPlayerId(message.data.playerId);
          break;

        case 'gameState':
          setPlayers(message.data.players);
          setFoods(message.data.foods);
          setYellowDots(message.data.yellowDots || []);
          setPortals(message.data.portals);
          break;

        case 'playerDeath':
          toast(message.data.message);
          break;

        case 'gameOver':
          setGameOver(true);
          setIsPlaying(false);
          setIsMinimapVisible(false);
          if (minimapTimerRef.current) {
            clearTimeout(minimapTimerRef.current);
          }
          if (minimapBlinkRef.current) {
            clearInterval(minimapBlinkRef.current);
          }
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          toast.error(`Game Over! ${message.data.message}`);
          break;
          
        case 'minimapUpdate':
          // Clear any existing timers if this is a reset
          if (message.data.reset) {
            if (minimapTimerRef.current) {
              clearTimeout(minimapTimerRef.current);
            }
            if (minimapBlinkRef.current) {
              clearInterval(minimapBlinkRef.current);
            }
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
          }
          
          setIsMinimapVisible(message.data.visible);
          setMinimapTimeLeft(message.data.duration);
          
          // Start new countdown
          let timeLeft = message.data.duration;
          
          // Clear existing countdown interval if it exists
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          
          countdownIntervalRef.current = window.setInterval(() => {
            timeLeft -= 1;
            setMinimapTimeLeft(timeLeft);
            
            // Start blinking when 3 seconds are left
            if (timeLeft === 3) {
              // Clear any existing blink interval
              if (minimapBlinkRef.current) {
                clearInterval(minimapBlinkRef.current);
              }
              
              let isVisible = true;
              minimapBlinkRef.current = window.setInterval(() => {
                isVisible = !isVisible;
                setIsMinimapVisible(isVisible);
              }, 500);
            }
            
            if (timeLeft <= 0) {
              if (countdownIntervalRef.current) {
                clearInterval(countdownIntervalRef.current);
              }
            }
          }, 1000);
          
          // Set timeout to stop the minimap visibility
          minimapTimerRef.current = window.setTimeout(() => {
            setIsMinimapVisible(false);
            if (minimapBlinkRef.current) {
              clearInterval(minimapBlinkRef.current);
            }
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current);
            }
          }, message.data.duration * 1000);
          break;
      }
    };

    ws.onclose = () => {
      console.log('Disconnected from server');
      toast.error('Disconnected from game server');
      
      // Attempt to reconnect with exponential backoff
      if (reconnectAttempts < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
        console.log(`Attempting to reconnect in ${delay/1000} seconds...`);
        
        if (reconnectTimerRef.current) {
          clearTimeout(reconnectTimerRef.current);
        }
        
        reconnectTimerRef.current = window.setTimeout(() => {
          setReconnectAttempts(prev => prev + 1);
          connectToServer();
        }, delay);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    wsRef.current = ws;
  };

  const handleStartGame = () => {
    if (!playerName.trim()) {
      toast.error("Please enter a name first!");
      return;
    }

    wsRef.current?.send(JSON.stringify({
      type: 'spawn',
      playerName: playerName.trim(),
      playerId
    }));
    
    setIsPlaying(true);
  };

  const handleDirection = (newDirection: Direction) => {
    const oppositeDirections = {
      'UP': 'DOWN',
      'DOWN': 'UP',
      'LEFT': 'RIGHT',
      'RIGHT': 'LEFT'
    };
    
    if (oppositeDirections[direction] === newDirection) {
      return;
    }

    if (direction !== newDirection) {
      setDirection(newDirection);
      wsRef.current?.send(JSON.stringify({
        type: 'direction',
        direction: newDirection,
        playerId
      }));
      updateGame();
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
    }

    const now = Date.now();
    if (now - lastKeyPress.current < 50) return;
    lastKeyPress.current = now;

    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        event.preventDefault();
        if (direction !== 'DOWN') {
          handleDirection('UP');
        }
        break;
      case 'arrowdown':
      case 's':
        event.preventDefault();
        if (direction !== 'UP') {
          handleDirection('DOWN');
        }
        break;
      case 'arrowleft':
      case 'a':
        event.preventDefault();
        if (direction !== 'RIGHT') {
          handleDirection('LEFT');
        }
        break;
      case 'arrowright':
      case 'd':
        event.preventDefault();
        if (direction !== 'LEFT') {
          handleDirection('RIGHT');
        }
        break;
      case ' ':
        event.preventDefault();
        if (currentPlayer?.speedBoostPercentage > 0) {
          setIsSpeedBoostActive(true);
        }
        break;
    }
  };

  const handleKeyUp = (event: KeyboardEvent) => {
    if (event.key === ' ') {
      setIsSpeedBoostActive(false);
    }
  };

  const updateGame = () => {
    if (!wsRef.current || gameOver) return;

    wsRef.current.send(JSON.stringify({
      type: 'update',
      playerId
    }));

    if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage > 0) {
      wsRef.current.send(JSON.stringify({
        type: 'speedBoost',
        playerId
      }));
    } else if (isSpeedBoostActive && currentPlayer?.speedBoostPercentage <= 0) {
      setIsSpeedBoostActive(false);
    }
  };

  useEffect(() => {
    connectToServer();
    return () => {
      wsRef.current?.close();
      if (minimapTimerRef.current) {
        clearTimeout(minimapTimerRef.current);
      }
      if (minimapBlinkRef.current) {
        clearInterval(minimapBlinkRef.current);
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!gameOver && playerId && isPlaying) {
      const speed = isSpeedBoostActive ? INITIAL_SPEED / 2 : INITIAL_SPEED;
      gameLoop.current = window.setInterval(updateGame, speed);
      return () => clearInterval(gameLoop.current);
    }
  }, [gameOver, direction, isSpeedBoostActive, playerId, isPlaying]);

  const currentPlayer = players.find(p => p.id === playerId);
  const score = currentPlayer?.score || 0;
  const speedBoostPercentage = currentPlayer?.speedBoostPercentage || 0;

  const createHashPattern = () => {
    return (
      <div className="absolute inset-0 w-full h-full" style={{ backgroundColor: 'rgba(30,30,30,0.2)' }}>
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hash" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="none" />
              <path d="M0,10 l20,-20 M-5,5 l10,-10 M15,25 l10,-10"
                stroke="#1e1e1e"
                strokeWidth="2"
                opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hash)" />
        </svg>
      </div>
    );
  };

  const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

  const getViewportTransform = (snakeHead: Position) => {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;

    const viewportCenterX = containerWidth / 2;
    const viewportCenterY = containerHeight / 2;

    const targetX = viewportCenterX - (snakeHead.x * CELL_SIZE);
    const targetY = viewportCenterY - (snakeHead.y * CELL_SIZE);

    const now = performance.now();
    const deltaTime = now - lastUpdateTime.current;
    lastUpdateTime.current = now;

    const smoothing = 1 - Math.exp(-CAMERA_SMOOTHING * (deltaTime / 1000)); // Exponential smoothing

    cameraPositionRef.current.x = lerp(cameraPositionRef.current.x, targetX, smoothing);
    cameraPositionRef.current.y = lerp(cameraPositionRef.current.y, targetY, smoothing);

    return `translate3d(${Math.round(cameraPositionRef.current.x)}px, ${Math.round(cameraPositionRef.current.y)}px, 0)`;
  };

  const updateCamera = () => {
    if (currentPlayer?.snake?.[0]) {
      const container = document.querySelector('.game-container') as HTMLDivElement;
      if (container) {
        container.style.transform = getViewportTransform(currentPlayer.snake[0]);
      }
    }
    animationFrameRef.current = requestAnimationFrame(updateCamera);
  };

  useEffect(() => {
    updateCamera();
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (currentPlayer?.snake?.[0]) {
      const containerWidth = window.innerWidth;
      const containerHeight = window.innerHeight;

      cameraPositionRef.current = {
        x: containerWidth / 2 - (currentPlayer.snake[0].x * CELL_SIZE),
        y: containerHeight / 2 - (currentPlayer.snake[0].y * CELL_SIZE)
      };
    }
  }, [playerId]);

  const renderMinimap = () => {
    if (!isMinimapVisible) return null;
    
    const scale = MINIMAP_SIZE / (GRID_SIZE * CELL_SIZE);
    const blinkClass = minimapTimeLeft <= 3 ? "animate-pulse" : "";

    return (
      <div 
        style={{ zIndex: 999 }} 
        className={`absolute top-4 right-4 bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-3
          ${blinkClass}`}
      >
        {/* Timer display */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-white/70 font-medium">Minimap</div>
          <div className="text-xs text-white/90 font-semibold">{minimapTimeLeft}s</div>
        </div>

        <div
          className="relative rounded-xl overflow-hidden"
          style={{
            width: MINIMAP_SIZE,
            height: MINIMAP_SIZE,
          }}
        >
          {/* Background grid - white background for light mode */}
          <div className="absolute inset-0 bg-white/90" />

          {/* Game elements */}
          {players.map(player => {
            const isCurrentPlayer = player.id === playerId;
            if (!player.snake?.[0]) return null;
            
            return (
              <div
                key={`minimap-${player.id}`}
                className="absolute"
              >
                {isCurrentPlayer ? (
                  <>
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 text-[10px] whitespace-nowrap text-blue-600 font-medium"
                      style={{
                        left: (player.snake[0].x * CELL_SIZE * scale),
                        top: (player.snake[0].y * CELL_SIZE * scale) - 10,
                      }}
                    >
                      {player.name}
                    </div>
                    <div
                      className="absolute w-3 h-3 bg-blue-600"
                      style={{
                        left: (player.snake[0].x * CELL_SIZE * scale),
                        top: (player.snake[0].y * CELL_SIZE * scale),
                        transform: `translate(-50%, -50%) rotate(${
                          player.direction === 'UP' ? '0deg' :
                          player.direction === 'RIGHT' ? '90deg' :
                          player.direction === 'DOWN' ? '180deg' : '-90deg'
                        })`,
                        clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                      }}
                    />
                  </>
                ) : (
                  <div
                    className="absolute w-3 h-3 bg-red-600"
                    style={{
                      left: (player.snake[0].x * CELL_SIZE * scale),
                      top: (player.snake[0].y * CELL_SIZE * scale),
                      transform: `translate(-50%, -50%) rotate(${
                        player.direction === 'UP' ? '0deg' :
                        player.direction === 'RIGHT' ? '90deg' :
                        player.direction === 'DOWN' ? '180deg' : '-90deg'
                      })`,
                      clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
                    }}
                  />
                )}
              </div>
            );
          })}

          {foods.map((food, index) => (
            <div
              key={`minimap-food-${index}`}
              className={`absolute w-1 h-1 rounded-full ${
                food.type === 'special' ? 'bg-purple-600' : 'bg-red-600'
              }`}
              style={{
                left: (food.x * CELL_SIZE * scale),
                top: (food.y * CELL_SIZE * scale),
              }}
            />
          ))}
          
          {yellowDots.map((dot, index) => (
            <div
              key={`minimap-yellowdot-${index}`}
              className="absolute w-1 h-1 rounded-full bg-yellow-600"
              style={{
                left: (dot.x * CELL_SIZE * scale),
                top: (dot.y * CELL_SIZE * scale),
              }}
            />
          ))}

          {/* Grid overlay - darker gray for better visibility on white background */}
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)',
              backgroundSize: `${MINIMAP_SIZE / 10}px ${MINIMAP_SIZE / 10}px`
            }}
          />
        </div>
      </div>
    );
  };

  const isActivePlayer = (player: any) => {
    return player.id !== playerId || (player.id === playerId && isPlaying && !gameOver);
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [direction, currentPlayer?.speedBoostPercentage]);

  // Player Score UI
  const renderPlayerScore = () => {
    return (
      <div className="absolute top-4 transform left-1/2 -translate-x-1/2 z-[999] text-center">
        <div className="bg-black/40 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-white/20 text-white">
          <div className="text-3xl font-bold mb-1">{score}</div>
          <div className="text-xs uppercase tracking-widest opacity-70">SCORE</div>
        </div>
      </div>
    );
  };

  // Leaderboard UI
  const renderLeaderboard = () => {
    // Only show top 10 players
    const topPlayers = [...players]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
      
    return (
      <div className="absolute left-4 top-20 z-[999] max-w-[180px]">
        <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <h3 className="text-xs uppercase tracking-wider text-white font-semibold">Leaderboard</h3>
          </div>
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto scrollbar-thin">
            {topPlayers.map((player, index) => (
              <div
                key={player.id}
                className={`flex justify-between items-center text-xs rounded-lg px-2 py-1 ${
                  player.id === playerId 
                    ? 'bg-blue-500/30 text-white font-semibold' 
                    : 'text-white/90'
                }`}
              >
                <div className="flex items-center gap-1.5 truncate">
                  <span className="text-xs opacity-60 w-4">{index + 1}.</span>
                  <span className="truncate">{player.name}</span>
                </div>
                <span className="font-semibold">{player.score}</span>
              </div>
            ))}
            {players.length === 0 && (
              <div className="text-xs text-white/50 italic text-center py-2">
                No players online
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Speed Boost UI
  const renderSpeedBoost = () => {
    const boostActive = isSpeedBoostActive && speedBoostPercentage > 0;
    return (
      <div className="absolute right-4 top-1/2 transform -translate-y-1/2 z-[999]">
        <div className="bg-black/40 backdrop-blur-md p-3 rounded-2xl shadow-xl border border-white/20 flex flex-col items-center">
          <div className="flex items-center gap-1.5 mb-3">
            <Zap className={`w-4 h-4 ${boostActive ? 'text-yellow-400' : 'text-white/70'}`} />
            <div className="text-xs uppercase tracking-wider text-white/90 font-semibold">Boost</div>
          </div>
          
          <div className="relative h-[150px] w-6 bg-gray-900/60 rounded-full overflow-hidden mb-2">
            <div 
              className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ease-out ${
                boostActive ? 'bg-gradient-to-t from-yellow-500 to-blue-500 animate-pulse' : 'bg-gradient-to-t from-blue-400 to-blue-600'
              }`}
              style={{ height: `${speedBoostPercentage}%` }}
            />
            
            {/* Boost level markers */}
            <div className="absolute inset-0 flex flex-col justify-between py-2 pointer-events-none">
              {[0, 1, 2, 3, 4].map((_, i) => (
                <div key={i} className="w-full h-px bg-white/20" />
              ))}
            </div>
          </div>
          
          <div className="text-xs text-white text-center">
            {Math.round(speedBoostPercentage)}%
          </div>
          
          {boostActive && (
            <div className="text-xs text-yellow-400 font-semibold mt-1 animate-pulse">ACTIVE</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/50 dark:from-gray-900 dark:to-gray-800">
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed top-4 left-4 p-2 rounded-lg bg-gray-200/80 dark:bg-gray-700/80 border-2 border-gray-300 dark:border-gray-600 z-[999]"
      >
        {theme === 'dark' ? (
          <Sun className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        ) : (
          <Moon className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        )}
      </button>

      {!isPlaying && !gameOver && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-sm w-full">
            <h2 className="text-2xl font-bold text-center text-white mb-6">Welcome to Snake Game</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="playerName" className="block text-sm font-medium text-white/80 mb-2">
                  Enter your name
                </label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your name"
                  maxLength={15}
                />
              </div>
              <button
                onClick={handleStartGame}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors mt-4"
              >
                <Play className="w-5 h-5" />
                Start Game
              </button>
            </div>
          </div>
        </div>
      )}

      {renderMinimap()}
      {renderPlayerScore()}
      {renderLeaderboard()}
      {renderSpeedBoost()}

      <div className="fixed inset-0 bg-white dark:bg-gray-800 overflow-hidden">
        <div className="relative w-full h-full">
          {createHashPattern()}
          <div
            className="absolute game-container"
            style={{
              width: GRID_SIZE * CELL_SIZE,
              height: GRID_SIZE * CELL_SIZE,
              transform: currentPlayer?.snake?.[0] ?
                getViewportTransform(currentPlayer.snake[0]) :
                'translate3d(0, 0, 0)',
              willChange: 'transform',
              transition: 'transform 150ms linear'
            }}
          >
            <div
              className="absolute"
              style={{
                backgroundColor: 'white',
                backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.1) 1px, transparent 1px)',
                backgroundSize: `${CELL_SIZE}px ${CELL_SIZE}px`,
                width: '100%',
                height: '100%',
              }}
            />

            {/* Yellow dots with map icon */}
            {yellowDots.map((dot, index) => (
              <div
                key={`yellodot-${index}`}
                className="absolute rounded-full bg-yellow-500 animate-pulse flex items-center justify-center"
                style={{
                  width: CELL_SIZE - 2,
                  height: CELL_SIZE - 2,
                  left: dot.x * CELL_SIZE,
                  top: dot.y * CELL_SIZE,
                  transform: 'translate3d(0, 0, 0)',
                }}
              >
                <Map className="w-2 h-2 text-white" />
              </div>
            ))}

            {players.map(player => (
              player.snake.map((segment: Position, index: number) => (
                <div
                  key={`${player.id}-${index}`}
                  className={`absolute will-change-transform ${index === 0 ? 'z-20' : ''}`}
                  style={{
                    width: CELL_SIZE - 1,
                    height: CELL_SIZE - 1,
                    left: segment.x * CELL_SIZE,
                    top: segment.y * CELL_SIZE,
                    opacity: player.isPlaying ? 
                      Math.max(MIN_SNAKE_OPACITY, 1 - index * 0.1) : 
                      INACTIVE_PLAYER_OPACITY,
                    transform: 'translate3d(0, 0, 0)',
                    transition: 'all 150ms linear'
                  }}
                >
                  {index === 0 && (
                    <>
                      <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap flex flex-col items-center">
                        <span className="text-[10px] font-medium text-gray-600 dark:text-gray-300 tracking-tight opacity-50">
                          {player.name}
                        </span>
                        <svg
                          className="w-2 h-2 text-gray-600 dark:text-gray-300 mt-0.5 opacity-50"
                          fill="currentColor"
                          viewBox="0 0 16 16"
                        >
                          <path d="M8 10l-4-4h8l-4 4z" />
                        </svg>
                      </div>
                      <img
                        src="/defaultPic.webp"
                        alt="User"
                        className="w-full h-full rounded-sm object-cover"
                      />
                    </>
                  )}
                  {index > 0 && (
                    <div
                      className={`w-full h-full rounded-sm ${player.id === playerId ?
                        'bg-gray-800 dark:bg-gray-200' :
                        'bg-red-500 dark:bg-red-400'
                      }`}
                    />
                  )}
                </div>
              ))
            ))}

            {foods.map((food, index) => (
              <div
                key={`food-${index}`}
                className={`absolute rounded-full snake-food will-change-transform ${food.type === 'special' ? 'bg-purple-500' : 'bg-red-500'
                  }`}
                style={{
                  width: CELL_SIZE - 2,
                  height: CELL_SIZE - 2,
                  left: food.x * CELL_SIZE,
                  top: food.y * CELL_SIZE,
                  transform: 'translate3d(0, 0, 0)',
                }}
              />
            ))}

            {/* Portals with lightning icon */}
            {portals.map((portal, index) => (
              <div
                key={`portal-${index}`}
                className="absolute bg-blue-500 rounded-full animate-pulse will-change-transform flex items-center justify-center"
                style={{
                  width: CELL_SIZE,
                  height: CELL_SIZE,
                  left: portal.x * CELL_SIZE,
                  top: portal.y * CELL_SIZE,
                  boxShadow: '0 0 10px rgba(59, 130, 246, 0.5)',
                  transform: 'translate3d(0, 0, 0)',
                }}
              >
                <Zap className="w-2 h-2 text-white" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 w-64 h-64 z-[999]">
        <button
          className="absolute top-0 left-1/2 -translate-x-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
          onClick={() => handleDirection('UP')}
        >
          <ArrowUp className="w-6 h-6 text-gray-700 dark:text-gray-200" />
        </button>

        <button
          className="absolute left-0 top-1/2 -translate-y-1/2 p-4 bg-gray-200/80 dark:bg-gray-700/80 rounded-lg active:bg-gray-300 dark:active:bg-gray-600 border-2 border-gray-300 dark:border-gray-600"
          onClick={() => handle

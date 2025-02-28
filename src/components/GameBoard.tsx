
import React, { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { HomeIcon } from "lucide-react";

interface Player {
  id: string;
  name: string;
  snake: { x: number; y: number }[];
  direction: string;
  score: number;
  speedBoostPercentage: number;
  isPlaying: boolean;
  minimapVisible: boolean;
  minimapTimer: number | null;
}

interface Food {
  x: number;
  y: number;
  type: string;
}

interface GameState {
  players: Player[];
  foods: Food[];
  yellowDots: { x: number; y: number }[];
  portals: { x: number; y: number }[];
}

interface IPosition {
  x: number;
  y: number;
}

interface GameBoardProps {
  onBackToLobby?: () => void;
  wsUrl?: string;
}

const CELL_SIZE = 20;
const GRID_SIZE = 256;
const VIEWPORT_SIZE = 15;
const MINIMAP_SIZE = 100;
const CONTROLS_SIZE = 120;

const GameBoard: React.FC<GameBoardProps> = ({ 
  onBackToLobby,
  wsUrl = "ws://localhost:3001" 
}) => {
  const isMobile = useIsMobile();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [camera, setCamera] = useState<IPosition>({ x: 0, y: 0 });
  const [cellSize, setCellSize] = useState(CELL_SIZE);
  const [cameraFollowing, setCameraFollowing] = useState(true);
  const [viewportBounds, setViewportBounds] = useState({
    minX: 0,
    maxX: VIEWPORT_SIZE,
    minY: 0,
    maxY: VIEWPORT_SIZE,
  });
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [serverReconnectInterval, setServerReconnectInterval] = useState<number | null>(null);
  const [direction, setDirection] = useState("RIGHT");
  const [minimapVisible, setMinimapVisible] = useState(false);
  const [animationFrameId, setAnimationFrameId] = useState<number | null>(null);
  const [keyState, setKeyState] = useState<Record<string, boolean>>({});
  const [gameOver, setGameOver] = useState(false);
  const [gameOverMessage, setGameOverMessage] = useState("");
  const [finalScore, setFinalScore] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const minimapRef = useRef<HTMLCanvasElement | null>(null);

  const { toast } = useToast();

  const update = (timestamp: number) => {
    if (socket && playerId) {
      if (isPlaying) {
        // Handle movement based on keyState
        let newDirection = direction;
        if (keyState.ArrowUp && direction !== "DOWN") newDirection = "UP";
        else if (keyState.ArrowDown && direction !== "UP") newDirection = "DOWN";
        else if (keyState.ArrowLeft && direction !== "RIGHT") newDirection = "LEFT";
        else if (keyState.ArrowRight && direction !== "LEFT") newDirection = "RIGHT";

        if (newDirection !== direction) {
          setDirection(newDirection);
          socket.send(JSON.stringify({
            type: "direction",
            playerId,
            direction: newDirection,
          }));
        }

        // Send update and speed boost messages
        socket.send(JSON.stringify({
          type: "update",
          playerId,
        }));

        socket.send(JSON.stringify({
          type: "speedBoost",
          playerId,
        }));
      }
    }

    // Request next frame
    setAnimationFrameId(requestAnimationFrame(update));
  };

  // Connect to WebSocket
  useEffect(() => {
    const connectToServer = () => {
      console.log(`Connecting to WebSocket server at: ${wsUrl}`);
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("Connected to server");
        setIsConnected(true);
        if (serverReconnectInterval) {
          clearInterval(serverReconnectInterval);
          setServerReconnectInterval(null);
        }
      };

      ws.onclose = () => {
        console.log("Disconnected from server");
        setIsConnected(false);
        const intervalId = window.setInterval(() => {
          console.log(`Attempting to reconnect in 1 seconds...`);
          connectToServer();
        }, 1000);
        setServerReconnectInterval(intervalId);
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case "init":
              setPlayerId(message.data.playerId);
              break;
            case "gameState":
              setGameState(message.data);
              setGameStarted(true);
              // Update camera position to follow player
              if (cameraFollowing && playerId) {
                const player = message.data.players.find((p: Player) => p.id === playerId);
                if (player && player.snake.length > 0) {
                  updateCameraPosition(player.snake[0]);
                }
              }
              break;
            case "minimapUpdate":
              setMinimapVisible(message.data.visible);
              // Handle minimap timer if needed
              break;
            case "gameOver":
              setIsPlaying(false);
              setGameOver(true);
              setFinalScore(message.data.score);
              setGameOverMessage(message.data.message);
              toast({
                title: "Game Over",
                description: message.data.message,
              });
              break;
            case "playerDeath":
              if (message.data.playerId !== playerId) {
                toast({
                  title: "Player Eliminated",
                  description: message.data.message,
                });
              }
              break;
            case "sessionEnd":
              toast({
                title: "Game Ended",
                description: message.data.message,
              });
              if (onBackToLobby) {
                onBackToLobby();
              }
              break;
          }
        } catch (error) {
          console.error("Error parsing message:", error);
        }
      };

      setSocket(ws);

      return ws;
    };

    const ws = connectToServer();

    return () => {
      if (serverReconnectInterval) {
        clearInterval(serverReconnectInterval);
      }
      if (ws) {
        ws.close();
      }
    };
  }, [wsUrl, onBackToLobby, toast]);

  // Set up game loop
  useEffect(() => {
    if (isPlaying && isConnected) {
      const frameId = requestAnimationFrame(update);
      setAnimationFrameId(frameId);
      return () => {
        if (frameId) {
          cancelAnimationFrame(frameId);
        }
      };
    }
  }, [isPlaying, isConnected]);

  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setKeyState((prev) => ({ ...prev, [e.key]: true }));
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        setKeyState((prev) => ({ ...prev, [e.key]: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Drawing functions
  const clearCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, width, height);
  };

  const drawGrid = (ctx: CanvasRenderingContext2D, viewportWidth: number, viewportHeight: number) => {
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 0.5;

    for (let x = 0; x <= viewportWidth; x += cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, viewportHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= viewportHeight; y += cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(viewportWidth, y);
      ctx.stroke();
    }
  };

  const drawCell = (ctx: CanvasRenderingContext2D, x: number, y: number, color: string) => {
    const screenX = (x - viewportBounds.minX) * cellSize;
    const screenY = (y - viewportBounds.minY) * cellSize;

    ctx.fillStyle = color;
    ctx.fillRect(screenX, screenY, cellSize, cellSize);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(screenX, screenY, cellSize, cellSize);
  };

  const drawMinimap = () => {
    const minimap = minimapRef.current;
    if (!minimap || !gameState) return;

    const ctx = minimap.getContext("2d");
    if (!ctx) return;

    // Clear minimap
    ctx.fillStyle = "rgba(245, 245, 245, 0.7)";
    ctx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    // Draw grid borders
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const scale = MINIMAP_SIZE / GRID_SIZE;

    // Draw viewport area
    ctx.strokeStyle = "#ff0000";
    ctx.lineWidth = 2;
    ctx.strokeRect(
      viewportBounds.minX * scale,
      viewportBounds.minY * scale,
      (viewportBounds.maxX - viewportBounds.minX) * scale,
      (viewportBounds.maxY - viewportBounds.minY) * scale
    );

    // Draw players
    gameState.players.forEach((player) => {
      const color = player.id === playerId ? "#ff0000" : "#0000ff";
      player.snake.forEach((segment) => {
        ctx.fillStyle = color;
        ctx.fillRect(segment.x * scale, segment.y * scale, 2, 2);
      });
    });

    // Draw food (dots for visibility)
    gameState.foods.forEach((food) => {
      ctx.fillStyle = food.type === "special" ? "#ff00ff" : "#00ff00";
      ctx.fillRect(food.x * scale, food.y * scale, 2, 2);
    });

    // Draw yellow dots
    gameState.yellowDots.forEach((dot) => {
      ctx.fillStyle = "#ffff00";
      ctx.fillRect(dot.x * scale, dot.y * scale, 2, 2);
    });

    // Draw portals
    gameState.portals.forEach((portal) => {
      ctx.fillStyle = "#00ffff";
      ctx.fillRect(portal.x * scale, portal.y * scale, 2, 2);
    });
  };

  // Update camera position
  const updateCameraPosition = (pos: IPosition) => {
    if (!pos) return;

    const halfViewport = Math.floor(VIEWPORT_SIZE / 2);
    let newX = Math.max(0, pos.x - halfViewport);
    let newY = Math.max(0, pos.y - halfViewport);

    // Ensure the viewport doesn't go outside the grid
    newX = Math.min(newX, GRID_SIZE - VIEWPORT_SIZE);
    newY = Math.min(newY, GRID_SIZE - VIEWPORT_SIZE);

    setCamera({ x: newX, y: newY });
    setViewportBounds({
      minX: newX,
      maxX: newX + VIEWPORT_SIZE,
      minY: newY,
      maxY: newY + VIEWPORT_SIZE,
    });
  };

  // Direction control handler
  const handleDirectionControl = (newDirection: string) => {
    if (
      (newDirection === "UP" && direction !== "DOWN") ||
      (newDirection === "DOWN" && direction !== "UP") ||
      (newDirection === "LEFT" && direction !== "RIGHT") ||
      (newDirection === "RIGHT" && direction !== "LEFT")
    ) {
      setDirection(newDirection);
      if (socket && playerId) {
        socket.send(JSON.stringify({
          type: "direction",
          playerId,
          direction: newDirection,
        }));
      }
    }
  };

  // Render game canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gameState) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const viewportWidth = VIEWPORT_SIZE * cellSize;
    const viewportHeight = VIEWPORT_SIZE * cellSize;

    clearCanvas(ctx, viewportWidth, viewportHeight);
    drawGrid(ctx, viewportWidth, viewportHeight);

    // Draw food
    gameState.foods.forEach((food) => {
      if (
        food.x >= viewportBounds.minX &&
        food.x < viewportBounds.maxX &&
        food.y >= viewportBounds.minY &&
        food.y < viewportBounds.maxY
      ) {
        drawCell(
          ctx,
          food.x,
          food.y,
          food.type === "special" ? "#ff00ff" : "#00ff00"
        );
      }
    });

    // Draw yellow dots
    gameState.yellowDots.forEach((dot) => {
      if (
        dot.x >= viewportBounds.minX &&
        dot.x < viewportBounds.maxX &&
        dot.y >= viewportBounds.minY &&
        dot.y < viewportBounds.maxY
      ) {
        drawCell(ctx, dot.x, dot.y, "#ffff00");
      }
    });

    // Draw portals
    gameState.portals.forEach((portal) => {
      if (
        portal.x >= viewportBounds.minX &&
        portal.x < viewportBounds.maxX &&
        portal.y >= viewportBounds.minY &&
        portal.y < viewportBounds.maxY
      ) {
        drawCell(ctx, portal.x, portal.y, "#00ffff");
      }
    });

    // Draw players
    gameState.players.forEach((player) => {
      const isCurrentPlayer = player.id === playerId;
      const headColor = isCurrentPlayer ? "#ff0000" : "#0000ff";
      const bodyColor = isCurrentPlayer ? "#ff6666" : "#6666ff";

      player.snake.forEach((segment, index) => {
        if (
          segment.x >= viewportBounds.minX &&
          segment.x < viewportBounds.maxX &&
          segment.y >= viewportBounds.minY &&
          segment.y < viewportBounds.maxY
        ) {
          drawCell(ctx, segment.x, segment.y, index === 0 ? headColor : bodyColor);
        }
      });

      // Draw player name above the snake
      if (player.snake.length > 0) {
        const head = player.snake[0];
        if (
          head.x >= viewportBounds.minX &&
          head.x < viewportBounds.maxX &&
          head.y >= viewportBounds.minY &&
          head.y < viewportBounds.maxY
        ) {
          const screenX = (head.x - viewportBounds.minX) * cellSize + cellSize / 2;
          const screenY = (head.y - viewportBounds.minY) * cellSize - 5;
          ctx.fillStyle = "#000000";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText(player.name, screenX, screenY);
        }
      }
    });

    // Draw minimap if visible
    if (minimapVisible) {
      drawMinimap();
    }
  }, [gameState, cellSize, viewportBounds, playerId, minimapVisible]);

  // Adjust canvas size based on device
  useEffect(() => {
    const adjustCanvasSize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const smallerDimension = Math.min(window.innerWidth, window.innerHeight);
      let newCellSize;

      // Adjust cell size for mobile
      if (isMobile) {
        newCellSize = Math.floor((smallerDimension - 40) / VIEWPORT_SIZE);
      } else {
        newCellSize = CELL_SIZE;
      }

      setCellSize(newCellSize);

      canvas.width = VIEWPORT_SIZE * newCellSize;
      canvas.height = VIEWPORT_SIZE * newCellSize;
    };

    adjustCanvasSize();
    window.addEventListener("resize", adjustCanvasSize);

    return () => {
      window.removeEventListener("resize", adjustCanvasSize);
    };
  }, [isMobile]);

  const handleBackToLobby = () => {
    if (onBackToLobby) {
      onBackToLobby();
    }
  };

  const getCurrentPlayer = () => {
    if (!gameState || !playerId) return null;
    return gameState.players.find((p) => p.id === playerId);
  };

  // Extract the current player to show stats
  const currentPlayer = getCurrentPlayer();
  const playerScore = currentPlayer?.score || 0;
  const speedBoost = currentPlayer?.speedBoostPercentage || 0;

  if (gameOver) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg text-center">
          <h2 className="text-2xl font-bold mb-4">Game Over</h2>
          <p className="mb-2">{gameOverMessage}</p>
          <p className="text-xl mb-4">Your Score: <span className="font-bold">{finalScore}</span></p>
          <Button onClick={handleBackToLobby} className="w-full">
            Back to Lobby
          </Button>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4">Connecting to game server...</p>
      </div>
    );
  }

  if (!gameStarted || !gameState) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="mb-4">Waiting for game to start...</p>
        <Button onClick={handleBackToLobby} variant="outline">
          Back to Lobby
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <div className="relative">
        <div className="flex justify-between items-center w-full mb-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleBackToLobby}
            className="flex items-center gap-1"
          >
            <HomeIcon size={16} /> Lobby
          </Button>
          
          <div className="flex items-center gap-4">
            <div className="bg-white px-3 py-1 rounded shadow">
              <span className="font-bold">Score:</span> {playerScore}
            </div>
            {speedBoost > 0 && (
              <div className="bg-white px-3 py-1 rounded shadow">
                <span className="font-bold">Boost:</span> {speedBoost}%
              </div>
            )}
          </div>
        </div>
        
        <canvas
          ref={canvasRef}
          style={{
            border: "1px solid #ccc",
            borderRadius: "4px",
            boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          }}
        />

        {minimapVisible && (
          <div className="absolute top-16 right-4 z-10">
            <canvas
              ref={minimapRef}
              width={MINIMAP_SIZE}
              height={MINIMAP_SIZE}
              style={{
                border: "1px solid #000",
                backgroundColor: "rgba(255, 255, 255, 0.7)",
              }}
            />
          </div>
        )}

        {isMobile && (
          <div className="mt-4 flex justify-center">
            <div className="grid grid-cols-3 gap-2" style={{ width: `${CONTROLS_SIZE}px`, height: `${CONTROLS_SIZE}px` }}>
              <div></div>
              <button
                className="bg-gray-200 rounded-full flex items-center justify-center text-2xl"
                onTouchStart={() => handleDirectionControl("UP")}
              >
                ↑
              </button>
              <div></div>
              <button
                className="bg-gray-200 rounded-full flex items-center justify-center text-2xl"
                onTouchStart={() => handleDirectionControl("LEFT")}
              >
                ←
              </button>
              <div></div>
              <button
                className="bg-gray-200 rounded-full flex items-center justify-center text-2xl"
                onTouchStart={() => handleDirectionControl("RIGHT")}
              >
                →
              </button>
              <div></div>
              <button
                className="bg-gray-200 rounded-full flex items-center justify-center text-2xl"
                onTouchStart={() => handleDirectionControl("DOWN")}
              >
                ↓
              </button>
              <div></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameBoard;
 
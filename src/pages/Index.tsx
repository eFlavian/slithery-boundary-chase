
import { useEffect, useState } from "react";
import GameBoard from "@/components/GameBoard";
import SessionManager from "@/components/SessionManager";

const Index = () => {
  const [gameActive, setGameActive] = useState(false);
  const [wsUrl, setWsUrl] = useState("ws://localhost:3001");

  // Prevent touch devices from zooming when double-tapping the game
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventZoom, { passive: false });
    
    // Add meta tag to prevent scaling
    const metaTag = document.createElement('meta');
    metaTag.name = 'viewport';
    metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(metaTag);
    
    // Set WebSocket URL based on environment
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      // For production environment, use secure websocket
      setWsUrl(`wss://${window.location.hostname}/ws`);
    } else {
      // For development, use localhost
      setWsUrl("ws://localhost:3001");
    }
    
    return () => {
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);

  const handleGameStart = () => {
    console.log("Game start triggered from Index.tsx");
    setGameActive(true);
  };

  const handleBackToLobby = () => {
    setGameActive(false);
  };
  
  return gameActive ? (
    <GameBoard onBackToLobby={handleBackToLobby} wsUrl={wsUrl} />
  ) : (
    <div className="container mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-2">Snake Battle Royale</h1>
        <p className="text-lg text-gray-600">Create or join a game session to play with friends!</p>
      </div>
      <SessionManager wsUrl={wsUrl} onGameStart={handleGameStart} />
    </div>
  );
};

export default Index;

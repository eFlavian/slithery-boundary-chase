
import { useEffect, useState } from "react";
import GameBoard from "@/components/GameBoard";
import SessionManager from "@/components/SessionManager";

const Index = () => {
  const [inGame, setInGame] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [gameKey, setGameKey] = useState(Date.now()); // Key for complete recreation of the component
  
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
    
    // Add specific styles to ensure the game board is positioned correctly
    const style = document.createElement('style');
    style.textContent = `
      .game-container {
        will-change: transform;
        transform-origin: 0 0;
        position: absolute;
        z-index: 10;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);
  
  const handleJoinSession = (data: any) => {
    setSessionData(data);
    setInGame(true);
  };
  
  const handleLeaveGame = () => {
    setInGame(false);
    // Force recreation of GameBoard component next time by generating a new key
    setGameKey(Date.now());
  };
  
  return inGame ? (
    <GameBoard 
      key={`game-board-${gameKey}`} // Force complete recreation of component when game restarts
      sessionData={sessionData} 
      onLeaveGame={handleLeaveGame} 
    />
  ) : (
    <SessionManager onJoinSession={handleJoinSession} />
  );
};

export default Index;

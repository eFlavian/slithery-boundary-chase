
import { useEffect, useState } from "react";
import GameBoard from "@/components/GameBoard";
import SessionManager from "@/components/SessionManager";

const Index = () => {
  const [inGame, setInGame] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  
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
    
    return () => {
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);
  
  const handleJoinSession = (data: any) => {
    setSessionData(data);
    setInGame(true);
  };
  
  return inGame ? (
    <GameBoard sessionData={sessionData} onLeaveGame={() => setInGame(false)} />
  ) : (
    <SessionManager onJoinSession={handleJoinSession} />
  );
};

export default Index;

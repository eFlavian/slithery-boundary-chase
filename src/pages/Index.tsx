
import { useEffect, useState } from "react";
import { useSearchParams } from 'react-router-dom';
import GameBoard from "@/components/GameBoard";
import useGameWebSocket from "@/components/game/useGameWebSocket";
import Lobby from "@/components/game/Lobby";

const Index = () => {
  const [playerName, setPlayerName] = useState(() => {
    return localStorage.getItem('playerName') || '';
  });

  const {
    playerId,
    sessions,
    currentSession,
    isHost,
    isReady,
    joinCode,
    createSession,
    joinSession,
    leaveSession,
    toggleReady,
    toggleSessionVisibility,
    fetchSessions,
    startGame,
    isPlaying
  } = useGameWebSocket();

  const [searchParams] = useSearchParams();

  // Save player name to local storage
  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

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

  // Check for join code in URL
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl && playerId && playerName) {
      joinSession(codeFromUrl);
    }
  }, [searchParams, playerId, playerName]);

  const handleStartGame = () => {
    if (!playerName.trim()) {
      return;
    }
    startGame(playerName.trim());
  };
  
  return (
    <>
      {isPlaying ? (
        <GameBoard />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/50 dark:from-gray-900 dark:to-gray-800 p-4">
          <Lobby 
            playerName={playerName}
            setPlayerName={setPlayerName}
            playerId={playerId}
            sessions={sessions}
            currentSession={currentSession}
            isHost={isHost}
            isReady={isReady}
            joinCode={joinCode}
            createSession={createSession}
            joinSession={joinSession}
            leaveSession={leaveSession}
            toggleReady={toggleReady}
            toggleSessionVisibility={toggleSessionVisibility}
            fetchSessions={fetchSessions}
            handleStartGame={handleStartGame}
          />
        </div>
      )}
    </>
  );
};

export default Index;

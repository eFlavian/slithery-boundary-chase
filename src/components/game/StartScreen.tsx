
import React from 'react';
import MainMenu from './MainMenu';

type StartScreenProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  handleStartGame: () => void;
};

const StartScreen: React.FC<StartScreenProps> = ({ 
  playerName, 
  setPlayerName, 
  handleStartGame 
}) => {
  // This component is now just a wrapper for MainMenu to maintain backwards compatibility
  return (
    <MainMenu
      playerName={playerName}
      setPlayerName={setPlayerName}
      handleStartGame={handleStartGame}
      publicRooms={[]}
      currentRoom={null}
      isHost={false}
      isReady={false}
      allPlayersReady={false}
      onCreateRoom={() => {}}
      onJoinRoom={() => {}}
      onLeaveRoom={() => {}}
      onToggleReady={() => {}}
      onStartGame={() => {}}
    />
  );
};

export default StartScreen;

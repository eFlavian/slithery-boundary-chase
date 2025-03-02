
import React from 'react';
import { Button } from '@/components/ui/button';

type StartScreenProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  handleStartGame: () => void;
  onCreateRoom: (roomName: string, isPublic: boolean, maxPlayers: number) => boolean;
  onJoinRoom: () => void;
};

const StartScreen: React.FC<StartScreenProps> = ({ 
  playerName, 
  setPlayerName, 
  handleStartGame,
  onCreateRoom,
  onJoinRoom
}) => {
  return (
    <div className="space-y-4">
      <input
        type="text"
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        placeholder="Enter your name"
        maxLength={20}
      />
      
      <div className="space-y-2">
        <Button 
          onClick={handleStartGame}
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Single Player
        </Button>
        
        <Button 
          onClick={onJoinRoom}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          Join Room
        </Button>
        
        <Button 
          onClick={() => onCreateRoom('', true, 8)}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Create Room
        </Button>
      </div>
    </div>
  );
};

export default StartScreen;

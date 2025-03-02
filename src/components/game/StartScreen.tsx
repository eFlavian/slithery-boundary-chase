
import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type StartScreenProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  onSinglePlayer: () => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
};

const StartScreen: React.FC<StartScreenProps> = ({ 
  playerName, 
  setPlayerName, 
  onSinglePlayer,
  onCreateRoom,
  onJoinRoom
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSinglePlayer();
  };

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-white">Snake.io</h1>
        <p className="text-muted-foreground text-white/60">
          Enter your name to start playing
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Input
            type="text"
            placeholder="Your Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="bg-gray-800/80 border-gray-700 focus:border-blue-500 text-white"
            maxLength={16}
          />
        </div>
        
        <div className="grid gap-2">
          <Button 
            type="submit" 
            className="w-full bg-green-600 hover:bg-green-700"
            disabled={!playerName.trim()}
          >
            Play Solo
          </Button>
          
          <Button 
            type="button"
            onClick={onCreateRoom}
            className="w-full bg-blue-600 hover:bg-blue-700" 
            disabled={!playerName.trim()}
          >
            Create Room
          </Button>
          
          <Button 
            type="button"
            onClick={onJoinRoom}
            className="w-full bg-purple-600 hover:bg-purple-700"
            disabled={!playerName.trim()}
          >
            Join Room
          </Button>
        </div>
      </form>
    </div>
  );
};

export default StartScreen;

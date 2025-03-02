
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Users, Copy, ChevronLeft, Check, X } from 'lucide-react';
import { Room, RoomPlayer } from '@/types/room';
import { toast } from 'sonner';

interface RoomLobbyProps {
  room: Room;
  playerId: string | null;
  onLeaveRoom: () => void;
  onSetReady: (isReady: boolean) => void;
}

const RoomLobby: React.FC<RoomLobbyProps> = ({ 
  room, 
  playerId, 
  onLeaveRoom, 
  onSetReady 
}) => {
  const [copyButtonText, setCopyButtonText] = useState('Copy Code');
  
  const isCurrentPlayerReady = room.players.find(
    player => player.id === playerId
  )?.isReady || false;
  
  const allPlayersReady = room.players.every(player => player.isReady);
  const isCreator = room.players.find(player => player.id === playerId)?.isCreator || false;
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.id);
    setCopyButtonText('Copied!');
    setTimeout(() => setCopyButtonText('Copy Code'), 2000);
    toast.success('Room code copied to clipboard!');
  };

  const getReadyText = () => {
    if (isCurrentPlayerReady) {
      return 'Cancel Ready';
    }
    return 'Mark as Ready';
  };

  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 w-full max-w-md">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onLeaveRoom} 
            className="mr-2"
          >
            <ChevronLeft size={18} />
          </Button>
          <h2 className="text-2xl font-bold">{room.name}</h2>
        </div>
        <div className="text-sm bg-secondary/50 px-3 py-1 rounded-full">
          {room.visibility === 'public' ? 'Public' : 'Private'}
        </div>
      </div>
      
      <div className="mb-6 bg-card rounded-lg p-4 flex justify-between items-center">
        <div className="text-sm">
          Room Code
          <div className="text-lg font-mono mt-1">{room.id}</div>
        </div>
        <Button variant="outline" size="sm" onClick={handleCopyCode}>
          <Copy size={14} className="mr-2" />
          {copyButtonText}
        </Button>
      </div>
      
      <div className="mb-6">
        <div className="flex items-center mb-3">
          <Users size={16} className="mr-2" />
          <h3 className="font-medium">Players ({room.players.length}/{room.maxPlayers})</h3>
        </div>
        
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {room.players.map(player => (
            <PlayerItem 
              key={player.id} 
              player={player} 
              isCurrentPlayer={player.id === playerId} 
            />
          ))}
        </div>
      </div>
      
      <div className="flex flex-col gap-3">
        <Button
          variant={isCurrentPlayerReady ? "outline" : "default"}
          className="w-full"
          onClick={() => onSetReady(!isCurrentPlayerReady)}
        >
          {isCurrentPlayerReady ? <X size={18} className="mr-2" /> : <Check size={18} className="mr-2" />}
          {getReadyText()}
        </Button>
        
        <div className="text-center text-sm text-muted-foreground">
          {allPlayersReady 
            ? "All players are ready! Game will start soon..."
            : "Waiting for all players to be ready..."}
        </div>
      </div>
    </div>
  );
};

interface PlayerItemProps {
  player: RoomPlayer;
  isCurrentPlayer: boolean;
}

const PlayerItem: React.FC<PlayerItemProps> = ({ player, isCurrentPlayer }) => {
  return (
    <div className={`flex items-center justify-between p-3 rounded-md ${
      isCurrentPlayer ? 'bg-primary/10' : 'bg-card'
    }`}>
      <div className="flex items-center">
        <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary mr-3">
          {player.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-medium flex items-center gap-2">
            {player.name}
            {isCurrentPlayer && <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">You</span>}
            {player.isCreator && <span className="text-xs bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full">Host</span>}
          </div>
        </div>
      </div>
      <div className={`px-2 py-1 rounded-full text-xs ${
        player.isReady 
          ? 'bg-green-500/20 text-green-500' 
          : 'bg-gray-500/20 text-gray-500'
      }`}>
        {player.isReady ? 'Ready' : 'Not Ready'}
      </div>
    </div>
  );
};

export default RoomLobby;

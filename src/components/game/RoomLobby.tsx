
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Copy, Check, Share2 } from 'lucide-react';
import { toast } from 'sonner';

type Player = {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
};

type RoomLobbyProps = {
  roomId: string;
  roomName: string;
  isPublic: boolean;
  players: Player[];
  isHost: boolean;
  isReady: boolean;
  allPlayersReady: boolean;
  onToggleReady: () => void;
  onStartGame: () => void;
  onLeaveRoom: () => void;
};

const RoomLobby: React.FC<RoomLobbyProps> = ({
  roomId,
  roomName,
  isPublic,
  players,
  isHost,
  isReady,
  allPlayersReady,
  onToggleReady,
  onStartGame,
  onLeaveRoom,
}) => {
  // Generate a shareable link with the room ID
  const shareableLink = `${window.location.origin}?room=${roomId}`;

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(message))
      .catch(() => toast.error("Failed to copy"));
  };

  return (
    <div className="w-full">
      <button 
        onClick={onLeaveRoom}
        className="flex items-center text-white/70 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Leave Room
      </button>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-xl font-semibold text-white">{roomName}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={isPublic ? "secondary" : "outline"}>
              {isPublic ? "Public" : "Private"}
            </Badge>
            <p className="text-sm text-white/70">{players.length} player{players.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => copyToClipboard(roomId, "Room code copied to clipboard!")}
          >
            <span className="truncate max-w-32">Code: {roomId}</span>
            <Copy className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => copyToClipboard(shareableLink, "Link copied to clipboard!")}
          >
            <Share2 className="h-3.5 w-3.5" />
            <span>Share Link</span>
          </Button>
        </div>
      </div>
      
      <div className="space-y-2 max-h-40 overflow-y-auto mb-6">
        {players.map((player) => (
          <div 
            key={player.id} 
            className="flex justify-between items-center bg-black/30 border border-white/10 rounded-lg p-3"
          >
            <div className="flex items-center gap-2">
              <p className="font-medium text-white">{player.name}</p>
              {player.isHost && (
                <Badge variant="secondary" className="text-xs">Host</Badge>
              )}
            </div>
            <Badge 
              variant="outline"
              className={player.isReady ? "bg-green-600 text-white" : ""}
            >
              {player.isReady ? (
                <>
                  <Check className="h-3 w-3 mr-1" />
                  Ready
                </>
              ) : "Not Ready"}
            </Badge>
          </div>
        ))}
      </div>
      
      <div className="flex gap-3">
        <Button 
          onClick={onToggleReady}
          className={isReady ? "bg-gray-600 hover:bg-gray-700" : "bg-green-600 hover:bg-green-700 flex-1"}
        >
          {isReady ? "Cancel Ready" : "Ready"}
        </Button>
        
        {isHost && (
          <Button 
            onClick={onStartGame}
            disabled={!allPlayersReady || players.length < 2}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50"
          >
            Start Game
          </Button>
        )}
      </div>
      
      {!allPlayersReady && players.length >= 2 && (
        <p className="text-yellow-300 text-sm mt-2">
          Waiting for all players to be ready
        </p>
      )}
      
      {players.length < 2 && (
        <p className="text-yellow-300 text-sm mt-2">
          At least 2 players are needed to start
        </p>
      )}
    </div>
  );
};

export default RoomLobby;

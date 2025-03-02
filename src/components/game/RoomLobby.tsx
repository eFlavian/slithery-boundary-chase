
import React from 'react';
import { Users, ArrowLeft, Copy, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type Room = {
  id: string;
  name: string;
  code: string;
  isPrivate: boolean;
  players: string[];
  createdBy: string;
  maxPlayers: number;
  gameStarted: boolean;
};

type RoomLobbyProps = {
  room: Room;
  playerId: string | null;
  isReady: boolean;
  onBack: () => void;
  onReady: () => void;
};

const RoomLobby: React.FC<RoomLobbyProps> = ({ 
  room, 
  playerId,
  isReady,
  onBack, 
  onReady 
}) => {
  const isCreator = playerId === room.createdBy;
  
  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.code);
    toast.success('Room code copied to clipboard');
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              className="p-2 mr-2 text-white/70 hover:text-white hover:bg-white/10"
              onClick={onBack}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h2 className="text-2xl font-bold text-white">
              {room.name}
            </h2>
          </div>
          
          <div className="flex items-center text-xs">
            <span className="bg-gray-700 rounded-l px-2 py-1 text-gray-300">
              {room.players.length}/{room.maxPlayers}
            </span>
            <span className={`rounded-r px-2 py-1 ${room.isPrivate ? 'bg-purple-900/50 text-purple-300' : 'bg-green-900/50 text-green-300'}`}>
              {room.isPrivate ? 'Private' : 'Public'}
            </span>
          </div>
        </div>
        
        {room.isPrivate && (
          <div className="mb-6 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400 mb-1">Room Code</p>
                <p className="text-xl font-mono font-semibold tracking-wider text-white">{room.code}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white"
                onClick={copyRoomCode}
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
        
        <div className="mb-6">
          <h3 className="text-white/80 font-semibold mb-3 flex items-center gap-2">
            <Users className="w-5 h-5" /> Players ({room.players.length})
          </h3>
          
          <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
            {Array.isArray(room.players) && room.players.map((player, index) => (
              <div 
                key={index}
                className="flex justify-between items-center p-2 bg-gray-800/40 rounded-lg border border-gray-700/50"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                    {player.substring(0, 2)}
                  </div>
                  <span className="text-white">{player}</span>
                  {player === room.createdBy && (
                    <span className="text-xs bg-yellow-900/50 text-yellow-300 px-1.5 py-0.5 rounded">Host</span>
                  )}
                </div>
                <div>
                  {/* This would normally show the ready status of each player */}
                  {player === playerId && isReady ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <Button
            onClick={onReady}
            className={`w-full py-3 ${
              isReady 
                ? 'bg-green-600 hover:bg-green-700' 
                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
            }`}
            disabled={isReady}
          >
            {isReady ? 'Ready!' : 'Ready Up'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RoomLobby;

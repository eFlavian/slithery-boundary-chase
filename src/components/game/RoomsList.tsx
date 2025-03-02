
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRightCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

type Room = {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  host: string;
};

type RoomsListProps = {
  rooms: Room[];
  onJoinRoom: (roomId: string) => void;
  onCreateRoom: () => void;
  onBack: () => void;
};

const RoomsList: React.FC<RoomsListProps> = ({ rooms, onJoinRoom, onCreateRoom, onBack }) => {
  const [manualRoomCode, setManualRoomCode] = useState('');
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Room code copied to clipboard!"))
      .catch(() => toast.error("Failed to copy"));
  };

  const handleManualJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualRoomCode.trim()) {
      // Remove any "room_" prefix if user mistakenly included it
      const cleanCode = manualRoomCode.trim().startsWith('room_') 
        ? manualRoomCode.trim().substring(5) 
        : manualRoomCode.trim();
        
      onJoinRoom(cleanCode);
    } else {
      toast.error("Please enter a room code");
    }
  };

  return (
    <div className="space-y-4 w-full">
      <button 
        onClick={onBack}
        className="flex items-center text-white/70 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Menu
      </button>
      
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">Available Rooms</h3>
        <Button 
          onClick={onCreateRoom}
          className="bg-green-600 hover:bg-green-700"
        >
          Create Room
        </Button>
      </div>
      
      <form onSubmit={handleManualJoin} className="flex gap-2 mb-4">
        <input
          type="text"
          value={manualRoomCode}
          onChange={(e) => setManualRoomCode(e.target.value.toUpperCase())}
          className="flex-1 px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono tracking-wider"
          placeholder="Enter Room Code"
          maxLength={10}
        />
        <Button
          type="submit"
          disabled={!manualRoomCode.trim()}
          className="bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Join
        </Button>
      </form>
      
      {rooms.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {rooms.map((room) => (
            <div 
              key={room.id} 
              className="flex justify-between items-center bg-black/30 border border-white/10 rounded-lg p-3"
            >
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium text-white">{room.name}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => copyToClipboard(room.id)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-white/70">
                  {room.playerCount}/{room.maxPlayers} players • Host: {room.host}
                </p>
              </div>
              <Button 
                onClick={() => onJoinRoom(room.id)}
                variant="ghost" 
                className="text-white hover:bg-white/10"
              >
                <ArrowRightCircle className="mr-1 h-4 w-4" />
                Join
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 bg-black/20 rounded-lg border border-white/10">
          <p className="text-white/60 mb-4">No public rooms available</p>
          <Button 
            onClick={onCreateRoom}
            className="bg-green-600 hover:bg-green-700"
          >
            Create New Room
          </Button>
        </div>
      )}
    </div>
  );
};

export default RoomsList;


import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRightCircle } from 'lucide-react';

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
      
      {rooms.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {rooms.map((room) => (
            <div 
              key={room.id} 
              className="flex justify-between items-center bg-black/30 border border-white/10 rounded-lg p-3"
            >
              <div>
                <p className="font-medium text-white">{room.name}</p>
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

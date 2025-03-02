
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Plus, Users, Lock, Globe } from 'lucide-react';
import { Room } from '@/types/room';

interface RoomsListProps {
  rooms: Room[];
  onRefresh: () => void;
  onJoinRoom: (roomId: string) => void;
  onCreateRoomClick: () => void;
}

const RoomsList: React.FC<RoomsListProps> = ({ 
  rooms, 
  onRefresh,
  onJoinRoom, 
  onCreateRoomClick 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredRooms(rooms);
    } else {
      setFilteredRooms(
        rooms.filter(room => 
          room.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }
  }, [rooms, searchTerm]);

  useEffect(() => {
    // Refresh room list every 5 seconds
    const interval = setInterval(() => {
      onRefresh();
    }, 5000);
    
    return () => clearInterval(interval);
  }, [onRefresh]);

  // Filter to show only public rooms that aren't in progress
  const availableRooms = filteredRooms.filter(room => 
    room.visibility === 'public' && !room.gameInProgress
  );

  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 w-full max-w-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Available Rooms</h2>
        <Button onClick={onRefresh} variant="outline" size="sm">
          Refresh
        </Button>
      </div>
      
      <div className="relative mb-6">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search rooms..."
          className="pl-8 pr-4 py-2 w-full rounded-md border bg-background"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>
      
      <div className="mb-6">
        <Button onClick={onCreateRoomClick} className="w-full">
          <Plus className="mr-2" size={18} />
          Create New Room
        </Button>
      </div>
      
      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
        {availableRooms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No rooms available
          </div>
        ) : (
          availableRooms.map(room => (
            <div 
              key={room.id} 
              className="border rounded-lg p-4 flex justify-between items-center bg-card hover:bg-card/80 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{room.name}</h3>
                  {room.visibility === 'private' ? (
                    <Lock size={14} className="text-amber-500" />
                  ) : (
                    <Globe size={14} className="text-blue-500" />
                  )}
                </div>
                <div className="flex items-center text-sm text-muted-foreground mt-1">
                  <Users size={14} className="mr-1" />
                  {room.players.length} / {room.maxPlayers} players
                </div>
              </div>
              <Button 
                onClick={() => onJoinRoom(room.id)} 
                variant="secondary"
                disabled={room.players.length >= room.maxPlayers}
              >
                Join
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RoomsList;

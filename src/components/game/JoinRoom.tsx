
import React, { useState, useEffect } from 'react';
import { Users, ArrowLeft, Search, RefreshCw, Lock, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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

type JoinRoomProps = {
  availableRooms: Room[];
  onBack: () => void;
  onJoinRoom: (roomId: string, code?: string) => void;
  onRefreshRooms: () => void;
};

const JoinRoom: React.FC<JoinRoomProps> = ({ 
  availableRooms, 
  onBack, 
  onJoinRoom,
  onRefreshRooms
}) => {
  const [privateCode, setPrivateCode] = useState('');
  const [privateRoomId, setPrivateRoomId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const filteredRooms = availableRooms
    .filter(room => !room.gameStarted && !room.isPrivate)
    .filter(room => 
      room.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const handleRefresh = () => {
    setIsRefreshing(true);
    onRefreshRooms();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleJoinPrivate = () => {
    if (privateCode.trim()) {
      onJoinRoom(privateRoomId || 'code', privateCode.trim());
    }
  };

  useEffect(() => {
    onRefreshRooms();
  }, [onRefreshRooms]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center mb-4">
          <Button 
            variant="ghost" 
            className="p-2 mr-2 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-green-400" /> Join Room
          </h2>
        </div>
        
        <div className="mb-4">
          <h3 className="text-white/80 font-semibold mb-2 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Join Private Room
          </h3>
          <div className="flex gap-2">
            <Input
              value={privateCode}
              onChange={(e) => setPrivateCode(e.target.value)}
              className="bg-gray-900/60 border border-white/20 text-white"
              placeholder="Enter room code"
              maxLength={6}
            />
            <Button
              onClick={handleJoinPrivate}
              className="whitespace-nowrap bg-purple-600 hover:bg-purple-700"
              disabled={!privateCode.trim()}
            >
              Join
            </Button>
          </div>
        </div>
        
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white/80 font-semibold">Public Rooms</h3>
          <Button 
            variant="ghost" 
            size="sm"
            className="p-1 text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-gray-900/60 border border-white/20 text-white pl-10"
            placeholder="Search rooms..."
          />
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {filteredRooms.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              No public rooms available
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRooms.map(room => (
                <div 
                  key={room.id}
                  className="bg-gray-800/60 rounded-lg p-3 border border-gray-700/50 hover:border-blue-700/50 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-white">{room.name}</h4>
                    <span className="text-xs bg-gray-700 rounded px-2 py-1 text-gray-300">
                      {room.players.length}/{room.maxPlayers}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">Created by {room.createdBy}</span>
                    <Button
                      size="sm"
                      onClick={() => onJoinRoom(room.id)}
                      className="bg-green-600 hover:bg-green-700"
                      disabled={room.players.length >= room.maxPlayers}
                    >
                      Join
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinRoom;

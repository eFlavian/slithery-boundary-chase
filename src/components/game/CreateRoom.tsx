
import React, { useState } from 'react';
import { Crown, ArrowLeft, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

type CreateRoomProps = {
  onBack: () => void;
  onCreateRoom: (name: string, isPrivate: boolean, maxPlayers: number) => void;
};

const CreateRoom: React.FC<CreateRoomProps> = ({ onBack, onCreateRoom }) => {
  const [roomName, setRoomName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(8);
  
  const handleCreateRoom = () => {
    if (!roomName.trim()) return;
    onCreateRoom(roomName.trim(), isPrivate, maxPlayers);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="p-2 mr-2 text-white/70 hover:text-white hover:bg-white/10"
            onClick={onBack}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Crown className="w-6 h-6 text-yellow-400" /> Create Room
          </h2>
        </div>
        
        <div className="space-y-4 mb-6">
          <div>
            <Label htmlFor="roomName" className="text-white/80 mb-2">
              Room Name
            </Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              className="bg-gray-900/60 border border-white/20 text-white"
              placeholder="My Snake Room"
              maxLength={20}
            />
          </div>
          
          <div>
            <Label htmlFor="maxPlayers" className="text-white/80 mb-2">
              Max Players: {maxPlayers}
            </Label>
            <input
              id="maxPlayers"
              type="range"
              min="2"
              max="16"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              type="button"
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                isPrivate ? 'border-purple-500/50 bg-purple-900/20' : 'border-gray-600 bg-gray-800/30'
              }`}
              onClick={() => setIsPrivate(true)}
            >
              <Lock className={`w-4 h-4 ${isPrivate ? 'text-purple-400' : 'text-gray-400'}`} />
              <span className={isPrivate ? 'text-purple-300' : 'text-gray-300'}>Private</span>
            </button>
            
            <button
              type="button"
              className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg border ${
                !isPrivate ? 'border-green-500/50 bg-green-900/20' : 'border-gray-600 bg-gray-800/30'
              }`}
              onClick={() => setIsPrivate(false)}
            >
              <Unlock className={`w-4 h-4 ${!isPrivate ? 'text-green-400' : 'text-gray-400'}`} />
              <span className={!isPrivate ? 'text-green-300' : 'text-gray-300'}>Public</span>
            </button>
          </div>
        </div>
        
        <Button
          onClick={handleCreateRoom}
          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white py-3"
          disabled={!roomName.trim()}
        >
          Create Room
        </Button>
      </div>
    </div>
  );
};

export default CreateRoom;

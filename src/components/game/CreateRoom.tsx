
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';

type CreateRoomProps = {
  onCreateRoom: (roomName: string, isPublic: boolean, maxPlayers: number) => void;
  onBack: () => void;
};

const CreateRoom: React.FC<CreateRoomProps> = ({ onCreateRoom, onBack }) => {
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(8);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomName.trim()) {
      onCreateRoom(roomName.trim(), isPublic, maxPlayers);
    }
  };

  return (
    <div className="w-full">
      <button 
        onClick={onBack}
        className="flex items-center text-white/70 hover:text-white mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        Back to Rooms
      </button>
      
      <h3 className="text-xl font-semibold text-white mb-4">Create a New Room</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="roomName" className="text-white">Room Name</Label>
          <input
            id="roomName"
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter room name"
            maxLength={20}
            required
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="isPublic" className="text-white">Public Room</Label>
          <Switch
            id="isPublic"
            checked={isPublic}
            onCheckedChange={setIsPublic}
          />
        </div>
        
        <div>
          <Label htmlFor="maxPlayers" className="text-white">Max Players</Label>
          <select
            id="maxPlayers"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[2, 4, 6, 8, 10, 12, 16].map(num => (
              <option key={num} value={num}>{num} Players</option>
            ))}
          </select>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-green-600 hover:bg-green-700"
        >
          Create Room
        </Button>
      </form>
    </div>
  );
};

export default CreateRoom;

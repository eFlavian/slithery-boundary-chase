
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Globe, Lock, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

interface CreateRoomProps {
  onCreateRoom: (name: string, visibility: 'public' | 'private', maxPlayers: number) => void;
  onCancel: () => void;
  isCreating: boolean;
}

const CreateRoom: React.FC<CreateRoomProps> = ({ 
  onCreateRoom, 
  onCancel,
  isCreating 
}) => {
  const [roomName, setRoomName] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [maxPlayers, setMaxPlayers] = useState(4);

  const handleCreateRoom = () => {
    if (!roomName.trim()) {
      toast.error("Please enter a room name");
      return;
    }
    
    console.log("Creating room with:", { roomName, visibility, maxPlayers });
    onCreateRoom(roomName.trim(), visibility, maxPlayers);
  };

  return (
    <div className="bg-background/80 backdrop-blur-sm rounded-lg p-6 w-full max-w-md">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onCancel} 
          className="mr-2"
        >
          <ArrowLeft size={18} />
        </Button>
        <h2 className="text-2xl font-bold">Create Room</h2>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Room Name</label>
          <input
            type="text"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            placeholder="Enter room name"
            className="w-full px-3 py-2 border rounded-md bg-background"
            maxLength={20}
            disabled={isCreating}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Visibility</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`flex items-center gap-2 px-4 py-2 border rounded-md flex-1 ${
                visibility === 'public' 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background text-foreground'
              }`}
              disabled={isCreating}
            >
              <Globe size={16} />
              Public
            </button>
            <button
              type="button"
              onClick={() => setVisibility('private')}
              className={`flex items-center gap-2 px-4 py-2 border rounded-md flex-1 ${
                visibility === 'private' 
                  ? 'bg-primary text-primary-foreground border-primary' 
                  : 'bg-background text-foreground'
              }`}
              disabled={isCreating}
            >
              <Lock size={16} />
              Private
            </button>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Max Players</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={2}
              max={10}
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
              className="flex-1"
              disabled={isCreating}
            />
            <span className="w-8 text-center">{maxPlayers}</span>
          </div>
        </div>
        
        <Button 
          onClick={handleCreateRoom} 
          className="w-full"
          disabled={!roomName.trim() || isCreating}
        >
          {isCreating ? 'Creating Room...' : 'Create Room'}
        </Button>
      </div>
    </div>
  );
};

export default CreateRoom;

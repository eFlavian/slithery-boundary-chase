
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

type CreateRoomProps = {
  onCreateRoom: (roomName: string, isPublic: boolean, maxPlayers: number) => void;
  onBack: () => void;
  currentRoom: {
    id: string;
    name: string;
    isPublic: boolean;
    players: any[];
  } | null;
};

const CreateRoom: React.FC<CreateRoomProps> = ({ onCreateRoom, onBack, currentRoom }) => {
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // If room creation was successful, this effect will detect it
  useEffect(() => {
    if (currentRoom && isSubmitting) {
      console.log('Room creation successful, currentRoom updated:', currentRoom);
      setIsSubmitting(false);
    }
  }, [currentRoom, isSubmitting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    
    // If already submitting, prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      console.log('CreateRoom: Creating room:', roomName, isPublic, maxPlayers);
      onCreateRoom(roomName.trim(), isPublic, maxPlayers);
      
      // Set a timeout to reset the submitting state if no response after 5 seconds
      setTimeout(() => {
        if (isSubmitting) {
          console.log('Room creation timed out');
          setIsSubmitting(false);
          toast.error('Room creation timed out. Please try again.');
        }
      }, 5000);
    } catch (error) {
      console.error('Error in CreateRoom handleSubmit:', error);
      toast.error('Failed to create room. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <button 
        onClick={onBack}
        className="flex items-center text-white/70 hover:text-white mb-4"
        disabled={isSubmitting}
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
            disabled={isSubmitting}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <Label htmlFor="isPublic" className="text-white">Public Room</Label>
          <Switch
            id="isPublic"
            checked={isPublic}
            onCheckedChange={setIsPublic}
            disabled={isSubmitting}
          />
        </div>
        
        <div>
          <Label htmlFor="maxPlayers" className="text-white">Max Players</Label>
          <select
            id="maxPlayers"
            value={maxPlayers}
            onChange={(e) => setMaxPlayers(Number(e.target.value))}
            className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={isSubmitting}
          >
            {[2, 4, 6, 8, 10, 12, 16].map(num => (
              <option key={num} value={num}>{num} Players</option>
            ))}
          </select>
        </div>
        
        <Button 
          type="submit" 
          className="w-full bg-green-600 hover:bg-green-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating...' : 'Create Room'}
        </Button>
      </form>
    </div>
  );
};

export default CreateRoom;

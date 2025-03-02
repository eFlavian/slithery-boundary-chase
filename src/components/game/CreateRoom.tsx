
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Loader2 } from 'lucide-react';
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
  const [previousRoomId, setPreviousRoomId] = useState<string | null>(null);
  const [timeoutId, setTimeoutId] = useState<number | null>(null);

  // If room creation was successful, this effect will detect it
  useEffect(() => {
    if (currentRoom) {
      console.log('CreateRoom: Room detected:', currentRoom);
      
      // Check if the room is new (not one we've already detected)
      if (previousRoomId !== currentRoom.id) {
        console.log('CreateRoom: New room detected, previousId:', previousRoomId, 'newId:', currentRoom.id);
        setPreviousRoomId(currentRoom.id);
        setIsSubmitting(false);
        
        // Clear any pending timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
          setTimeoutId(null);
        }
      }
    }
  }, [currentRoom, previousRoomId, timeoutId]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!roomName.trim()) {
      toast.error('Please enter a room name');
      return;
    }
    
    // If already submitting, prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    console.log('CreateRoom: Creating room:', roomName, isPublic, maxPlayers);
    
    try {
      onCreateRoom(roomName.trim(), isPublic, maxPlayers);
      
      // Set a timeout to reset the submitting state if no response after 10 seconds
      const id = window.setTimeout(() => {
        console.log('Room creation timed out');
        setIsSubmitting(false);
        toast.error('Room creation timed out. The server might be unavailable.');
        setTimeoutId(null);
      }, 10000);
      
      setTimeoutId(id);
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
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : 'Create Room'}
        </Button>

        {isSubmitting && (
          <p className="text-white/60 text-sm text-center animate-pulse">
            Waiting for server response...
          </p>
        )}
      </form>
    </div>
  );
};

export default CreateRoom;

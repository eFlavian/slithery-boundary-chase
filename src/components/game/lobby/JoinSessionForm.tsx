
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type JoinSessionFormProps = {
  playerNameValid: boolean;
  joinSession: (sessionId: string) => void;
  onCancel: () => void;
};

const JoinSessionForm: React.FC<JoinSessionFormProps> = ({ 
  playerNameValid, 
  joinSession,
  onCancel
}) => {
  const [joinCode, setJoinCode] = useState('');
  
  const handleJoinSession = () => {
    if (joinCode.trim() === '') {
      toast.error('Please enter a session ID');
      return;
    }
    joinSession(joinCode.trim());
    setJoinCode('');
    onCancel();
  };
  
  return (
    <div className="space-y-3">
      <Input
        value={joinCode}
        onChange={(e) => setJoinCode(e.target.value)}
        placeholder="Enter session ID"
        className="w-full bg-gray-900/60 border border-white/20 text-white"
      />
      <div className="flex gap-2">
        <Button
          onClick={handleJoinSession}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          disabled={!playerNameValid || !joinCode.trim()}
        >
          Join
        </Button>
        <Button
          onClick={onCancel}
          variant="outline"
          className="bg-transparent text-white border-white/20 hover:bg-white/10"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

export default JoinSessionForm;

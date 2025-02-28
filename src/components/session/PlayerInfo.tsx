
import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface PlayerInfoProps {
  playerName: string;
  setLocalName: (name: string) => void;
  localName: string;
  updateName: () => void;
}

const PlayerInfo: React.FC<PlayerInfoProps> = ({
  playerName,
  setLocalName,
  localName,
  updateName
}) => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col space-y-1">
        <span className="text-sm font-medium">Your Name</span>
        <div className="flex items-center space-x-2">
          <Input 
            value={localName} 
            onChange={(e) => setLocalName(e.target.value)}
            placeholder="Enter your name" 
            className="w-full"
          />
          <Button onClick={updateName} size="sm">Update</Button>
        </div>
      </div>
    </div>
  );
};

export default PlayerInfo;


import React from "react";
import { Button } from "@/components/ui/button";

interface LobbyFooterProps {
  leaveSession: () => void;
  toggleReady: () => void;
  isReady: boolean;
}

const LobbyFooter: React.FC<LobbyFooterProps> = ({
  leaveSession,
  toggleReady,
  isReady
}) => {
  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={leaveSession}>
        Leave Lobby
      </Button>
      <Button onClick={toggleReady} variant={isReady ? "outline" : "default"}>
        {isReady ? "Not Ready" : "Ready"}
      </Button>
    </div>
  );
};

export default LobbyFooter;


import React from "react";
import { Switch } from "@/components/ui/switch";

interface LobbyPrivacyToggleProps {
  isHost: boolean;
  isPublic: boolean;
  togglePrivacy: () => void;
}

const LobbyPrivacyToggle: React.FC<LobbyPrivacyToggleProps> = ({
  isHost,
  isPublic,
  togglePrivacy
}) => {
  if (!isHost) return null;
  
  return (
    <div className="flex items-center space-x-2">
      <Switch 
        id="public-mode"
        checked={isPublic}
        onCheckedChange={togglePrivacy}
      />
      <label htmlFor="public-mode" className="text-sm font-medium cursor-pointer">
        {isPublic ? "Public Lobby" : "Private Lobby"}
      </label>
    </div>
  );
};

export default LobbyPrivacyToggle;

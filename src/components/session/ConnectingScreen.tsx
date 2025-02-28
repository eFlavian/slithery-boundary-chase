
import React from "react";
import { Button } from "@/components/ui/button";

const ConnectingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <p className="mb-4">Connecting to game server...</p>
      <Button variant="outline" disabled>Please wait</Button>
    </div>
  );
};

export default ConnectingScreen;

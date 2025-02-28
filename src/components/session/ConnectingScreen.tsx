
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ConnectingScreenProps {
  onRetry?: () => void;
}

const ConnectingScreen: React.FC<ConnectingScreenProps> = ({ onRetry }) => {
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const [showRetry, setShowRetry] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const timer = setTimeout(() => {
      setConnectionAttempts(prev => prev + 1);
      if (connectionAttempts > 2) {
        setShowRetry(true);
        toast({
          title: "Connection Issue",
          description: "Having trouble connecting to the game server. You can retry or check your connection.",
          variant: "destructive"
        });
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [connectionAttempts, toast]);

  const handleRetry = () => {
    setConnectionAttempts(0);
    setShowRetry(false);
    if (onRetry) onRetry();
    toast({
      title: "Retrying connection",
      description: "Attempting to reconnect to the game server..."
    });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <p className="mb-4 text-lg">Connecting to game server... {connectionAttempts > 0 ? `(Attempt ${connectionAttempts})` : ''}</p>
      
      {showRetry ? (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Connection is taking longer than expected.</p>
          <Button onClick={handleRetry} variant="default">
            Retry Connection
          </Button>
        </div>
      ) : (
        <Button variant="outline" disabled>Please wait</Button>
      )}
    </div>
  );
};

export default ConnectingScreen;

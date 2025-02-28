
import React, { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";

interface WebSocketMessage {
  type: string;
  data?: any;
}

interface SessionWebSocketProps {
  wsUrl: string;
  onMessage: (data: any) => void;
  onConnectionChange: (isConnected: boolean) => void;
  onInit: (playerId: string) => void;
}

const SessionWebSocket: React.FC<SessionWebSocketProps> = ({
  wsUrl,
  onMessage,
  onConnectionChange,
  onInit,
}) => {
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const { toast } = useToast();

  const connectWebSocket = useCallback(() => {
    console.log("Attempting to connect WebSocket to:", wsUrl);
    
    if (wsConnection) {
      wsConnection.close();
    }
    
    const ws = new WebSocket(wsUrl);
    
    ws.addEventListener('open', () => {
      onConnectionChange(true);
      setWsConnection(ws);
      console.log("WebSocket connected successfully");
    });
    
    ws.addEventListener('close', () => {
      onConnectionChange(false);
      setWsConnection(null);
      console.log("WebSocket connection closed");
      
      // Automatic reconnection handled elsewhere
    });
    
    ws.addEventListener('error', (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect to the game server. Retrying...",
        variant: "destructive"
      });
    });
    
    setWsConnection(ws);
  }, [wsUrl, toast, onConnectionChange, wsConnection]);

  // Initial connection
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsConnection) {
        wsConnection.close();
      }
    };
  }, [wsUrl, connectWebSocket]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        console.log("Received WebSocket message:", data);
        
        if (data.type === 'init') {
          onInit(data.data.playerId);
        }
        
        onMessage(data);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };
    
    if (wsConnection) {
      wsConnection.addEventListener('message', handleMessage);
      return () => {
        wsConnection.removeEventListener('message', handleMessage);
      };
    }
  }, [wsConnection, onInit, onMessage]);

  // Make wsConnection and retry function available
  return (
    <>
      {React.Children.map(React.Children.only(null), child => {
        return React.cloneElement(child as React.ReactElement, { 
          wsConnection,
          retryConnection: connectWebSocket 
        });
      })}
    </>
  );
};

export { SessionWebSocket };
export type { WebSocketMessage };

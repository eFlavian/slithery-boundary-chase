import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import StartScreen from './StartScreen';
import RoomsList from './RoomsList';
import RoomLobby from './RoomLobby';
import CreateRoom from './CreateRoom';

type Room = {
  id: string;
  name: string;
  playerCount: number;
  maxPlayers: number;
  isPublic: boolean;
  host: string;
};

type Player = {
  id: string;
  name: string;
  isReady: boolean;
  isHost: boolean;
};

type MainMenuProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  handleStartGame: () => void;
  publicRooms: Room[];
  currentRoom: {
    id: string;
    name: string;
    isPublic: boolean;
    players: Player[];
  } | null;
  isHost: boolean;
  isReady: boolean;
  allPlayersReady: boolean;
  onCreateRoom: (roomName: string, isPublic: boolean, maxPlayers: number) => boolean;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  requestRoomUpdate?: () => void;
};

type View = 'main' | 'joinRoom' | 'createRoom' | 'roomLobby';

const MainMenu: React.FC<MainMenuProps> = ({ 
  playerName,
  setPlayerName,
  handleStartGame,
  publicRooms,
  currentRoom,
  isHost,
  isReady,
  allPlayersReady,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onToggleReady,
  onStartGame,
  requestRoomUpdate
}) => {
  const [view, setView] = useState<View>('main');
  
  useEffect(() => {
    console.log("MainMenu: Current room updated:", currentRoom);
    if (currentRoom) {
      setView('roomLobby');
    } else {
      setView('main');
    }
    console.log("MainMenu: View changed to:", currentRoom ? 'roomLobby' : 'main');
  }, [currentRoom]);
  
  const handleSinglePlayer = () => {
    if (!playerName.trim()) {
      toast.error("Please enter a name first!");
      return;
    }
    handleStartGame();
  };
  
  const handleCreateRoom = () => {
    setView('createRoom');
  };
  
  const handleJoinRoom = () => {
    setView('joinRoom');
  };
  
  const handleBackToMain = () => {
    setView('main');
  };
  
  const handleCreateRoomSubmit = (roomName: string, isPublic: boolean, maxPlayers: number) => {
    const success = onCreateRoom(roomName, isPublic, maxPlayers);
    if (success) {
      // View will be set by the useEffect when currentRoom updates
    } else {
      setView('main');
    }
  };

  const renderView = () => {
    switch (view) {
      case 'main':
        return (
          <StartScreen 
            playerName={playerName}
            setPlayerName={setPlayerName}
            onSinglePlayer={handleSinglePlayer}
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        );
        
      case 'joinRoom':
        return (
          <RoomsList 
            rooms={publicRooms}
            onJoinRoom={onJoinRoom}
            onCreateRoom={handleCreateRoom}
            onBack={handleBackToMain}
          />
        );
        
      case 'createRoom':
        return (
          <CreateRoom 
            onCreateRoom={handleCreateRoomSubmit}
            onBack={handleBackToMain}
            currentRoom={currentRoom}
          />
        );
        
      case 'roomLobby':
        if (!currentRoom) return null;
        return (
          <RoomLobby 
            roomId={currentRoom.id}
            roomName={currentRoom.name}
            isPublic={currentRoom.isPublic}
            players={currentRoom.players}
            isHost={isHost}
            isReady={isReady}
            allPlayersReady={allPlayersReady}
            onToggleReady={onToggleReady}
            onStartGame={onStartGame}
            onLeaveRoom={onLeaveRoom}
            onRefresh={requestRoomUpdate}
          />
        );
    }
  };

  return (
    <Card className="w-full max-w-md bg-black/60 border-gray-800">
      <CardContent className="p-6">
        {renderView()}
      </CardContent>
    </Card>
  );
};

export default MainMenu;

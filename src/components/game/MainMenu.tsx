
import React, { useState, useEffect } from 'react';
import StartScreen from './StartScreen';
import RoomsList from './RoomsList';
import CreateRoom from './CreateRoom';
import RoomLobby from './RoomLobby';
import { Room } from '@/types/room';

interface MainMenuProps {
  playerName: string;
  setPlayerName: (name: string) => void;
  playerId: string | null;
  handleStartGame: () => void;
  
  // Room-related props
  rooms: Room[];
  currentRoom: Room | null;
  isCreatingRoom: boolean;
  isJoiningRoom: boolean;
  getRoomsList: () => void;
  createRoom: (name: string, visibility: 'public' | 'private', maxPlayers: number) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  setPlayerReady: (isReady: boolean) => void;
}

type MenuView = 'start' | 'rooms' | 'create-room' | 'room-lobby';

const MainMenu: React.FC<MainMenuProps> = ({
  playerName,
  setPlayerName,
  playerId,
  handleStartGame,
  rooms,
  currentRoom,
  isCreatingRoom,
  isJoiningRoom,
  getRoomsList,
  createRoom,
  joinRoom,
  leaveRoom,
  setPlayerReady
}) => {
  const [view, setView] = useState<MenuView>('start');
  
  useEffect(() => {
    // If user joins a room, show the room lobby
    if (currentRoom) {
      setView('room-lobby');
    }
  }, [currentRoom]);
  
  useEffect(() => {
    // Get rooms list when viewing rooms
    if (view === 'rooms') {
      getRoomsList();
    }
  }, [view, getRoomsList]);
  
  const handleRoomsClick = () => {
    if (!playerName) {
      return;
    }
    setView('rooms');
    getRoomsList();
  };
  
  const handleCreateRoomClick = () => {
    setView('create-room');
  };
  
  const handleCancelCreateRoom = () => {
    setView('rooms');
  };
  
  const handleLeaveRoom = () => {
    leaveRoom();
    setView('rooms');
  };
  
  const renderContent = () => {
    switch (view) {
      case 'start':
        return (
          <StartScreen 
            playerName={playerName}
            setPlayerName={setPlayerName}
            handleStartGame={handleStartGame}
            onRoomsClick={handleRoomsClick}
          />
        );
      case 'rooms':
        return (
          <RoomsList 
            rooms={rooms}
            onRefresh={getRoomsList}
            onJoinRoom={joinRoom}
            onCreateRoomClick={handleCreateRoomClick}
          />
        );
      case 'create-room':
        return (
          <CreateRoom 
            onCreateRoom={createRoom}
            onCancel={handleCancelCreateRoom}
            isCreating={isCreatingRoom}
          />
        );
      case 'room-lobby':
        if (!currentRoom) return null;
        return (
          <RoomLobby 
            room={currentRoom}
            playerId={playerId}
            onLeaveRoom={handleLeaveRoom}
            onSetReady={setPlayerReady}
          />
        );
      default:
        return null;
    }
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {renderContent()}
    </div>
  );
};

export default MainMenu;

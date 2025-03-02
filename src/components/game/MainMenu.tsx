import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import StartScreen from './StartScreen';
import CreateRoom from './CreateRoom';
import RoomsList from './RoomsList';
import RoomLobby from './RoomLobby';

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
  onRequestRoomUpdate?: () => void;
};

type MenuView = 'main' | 'createRoom' | 'joinRoom';

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
  onRequestRoomUpdate,
}) => {
  const [menuView, setMenuView] = useState<MenuView>('main');
  
  // Parse URL parameters for room ID
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    
    if (roomParam && !currentRoom) {
      console.log(`Found room ID in URL: ${roomParam}`);
      onJoinRoom(roomParam);
    }
    
    // Log state for debugging
    console.log('MainMenu: Current room updated:', currentRoom);
    console.log('MainMenu: View changed to:', menuView);
  }, [currentRoom, onJoinRoom]);
  
  // Handle view transitions
  const goToMainMenu = () => setMenuView('main');
  const goToCreateRoom = () => setMenuView('createRoom');
  const goToJoinRoom = () => setMenuView('joinRoom');
  
  // Room is created or joined, show the lobby
  if (currentRoom) {
    return (
      <div className="w-full max-w-md">
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
          onRequestUpdate={onRequestRoomUpdate}
        />
      </div>
    );
  }
  
  // Show create room form
  if (menuView === 'createRoom') {
    return (
      <div className="w-full max-w-md">
        <CreateRoom 
          playerName={playerName}
          setPlayerName={setPlayerName}
          onCreateRoom={onCreateRoom}
          onBack={goToMainMenu}
          currentRoom={currentRoom}
        />
      </div>
    );
  }
  
  // Show list of rooms to join
  if (menuView === 'joinRoom') {
    return (
      <div className="w-full max-w-md">
        <RoomsList
          rooms={publicRooms}
          onJoinRoom={onJoinRoom}
          onCreateRoom={goToCreateRoom}
          onBack={goToMainMenu}
        />
      </div>
    );
  }
  
  // Main menu view
  return (
    <div className="w-full max-w-md">
      <StartScreen
        playerName={playerName}
        setPlayerName={setPlayerName}
        handleStartGame={handleStartGame}
        onCreateRoom={onCreateRoom}
        onJoinRoom={goToJoinRoom}
      />
    </div>
  );
};

export default MainMenu;

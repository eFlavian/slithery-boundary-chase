
import React, { useState, useEffect } from 'react';
import { Play } from 'lucide-react';
import RoomsList from './RoomsList';
import CreateRoom from './CreateRoom';
import RoomLobby from './RoomLobby';
import { toast } from 'sonner';

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
  onCreateRoom: (roomName: string, isPublic: boolean, maxPlayers: number) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: () => void;
  onToggleReady: () => void;
  onStartGame: () => void;
  onRefreshRoom?: () => void;  // New prop for manual refresh
};

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
  onRefreshRoom,
}) => {
  const [view, setView] = useState<'main' | 'rooms' | 'create'>('main');
  const [lastViewChangeTime, setLastViewChangeTime] = useState(Date.now());

  useEffect(() => {
    const savedName = localStorage.getItem('playerName');
    if (savedName && !playerName) {
      setPlayerName(savedName);
    }
  }, []);

  useEffect(() => {
    if (playerName) {
      localStorage.setItem('playerName', playerName);
    }
  }, [playerName]);

  useEffect(() => {
    if (currentRoom) {
      console.log('MainMenu: Current room detected, currentRoom:', currentRoom);
      const now = Date.now();
      if (now - lastViewChangeTime > 200) {
        console.log('MainMenu: Resetting view to main because current room detected');
        setView('main');
      }
    }
  }, [currentRoom, lastViewChangeTime]);

  useEffect(() => {
    console.log('MainMenu: Current room updated:', currentRoom);
  }, [currentRoom]);

  useEffect(() => {
    console.log('MainMenu: View changed to:', view);
    setLastViewChangeTime(Date.now());
  }, [view]);

  const checkRoomInUrl = () => {
    const queryParams = new URLSearchParams(window.location.search);
    const roomParam = queryParams.get('room');
    
    if (roomParam && playerName) {
      console.log('MainMenu: Found room param in URL:', roomParam);
      onJoinRoom(roomParam);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  // Check for room in URL on load and when playerName changes
  useEffect(() => {
    if (playerName) {
      checkRoomInUrl();
    }
  }, [playerName]);

  const handleCreateRoom = (roomName: string, isPublic: boolean, maxPlayers: number) => {
    console.log('MainMenu handling room creation:', roomName, isPublic, maxPlayers);
    
    if (!playerName.trim()) {
      toast.error("Please enter your name before creating a room");
      return;
    }

    try {
      console.log('MainMenu: Calling onCreateRoom');
      onCreateRoom(roomName, isPublic, maxPlayers);
      console.log('MainMenu: Room creation request sent');
    } catch (error) {
      console.error('Error in handleCreateRoom:', error);
      toast.error('Failed to create room. Please try again.');
    }
  };

  if (currentRoom) {
    console.log('MainMenu: Showing room lobby for room:', currentRoom.id);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
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
            onRefreshRoom={onRefreshRoom}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
        {view === 'main' && (
          <>
            <h2 className="text-2xl font-bold text-center text-white mb-6">Welcome to Snake Game</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="playerName" className="block text-sm font-medium text-white/80 mb-2">
                  Enter your name
                </label>
                <input
                  type="text"
                  id="playerName"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your name"
                  maxLength={15}
                />
              </div>
              
              <div className="flex flex-col space-y-3 mt-6">
                <button
                  onClick={() => playerName.trim() ? setView('rooms') : toast.error("Please enter your name")}
                  disabled={!playerName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Multiplayer Rooms
                </button>
                
                <div className="relative flex items-center py-2">
                  <div className="flex-grow border-t border-white/20"></div>
                  <span className="flex-shrink mx-4 text-white/60">or</span>
                  <div className="flex-grow border-t border-white/20"></div>
                </div>
                
                <button
                  onClick={handleStartGame}
                  disabled={!playerName.trim()}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-5 h-5" />
                  Quick Game
                </button>
              </div>
            </div>
          </>
        )}
        
        {view === 'rooms' && (
          <RoomsList
            rooms={publicRooms}
            onJoinRoom={onJoinRoom}
            onCreateRoom={() => setView('create')}
            onBack={() => setView('main')}
          />
        )}
        
        {view === 'create' && (
          <CreateRoom
            onCreateRoom={handleCreateRoom}
            onBack={() => setView('rooms')}
            currentRoom={currentRoom}
            playerName={playerName} // Pass playerName to CreateRoom
          />
        )}
      </div>
    </div>
  );
};

export default MainMenu;

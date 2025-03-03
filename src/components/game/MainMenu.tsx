import React, { useState, useEffect } from 'react';
import { Plus, Users, Globe, Lock, RefreshCw, ArrowRight } from 'lucide-react';
import { Room } from '@/types/gameTypes';

type MainMenuProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  rooms: Room[];
  currentRoom: Room | null;
  createRoom: (roomName: string, isPublic: boolean) => void;
  joinRoom: (roomId: string) => void;
  leaveRoom: () => void;
  toggleReady: () => void;
  refreshRooms: () => void;
  isConnected: boolean;
};

type ViewType = 'main' | 'create' | 'join' | 'lobby';

const MainMenu: React.FC<MainMenuProps> = ({
  playerName,
  setPlayerName,
  rooms,
  currentRoom,
  createRoom,
  joinRoom,
  leaveRoom,
  toggleReady,
  refreshRooms,
  isConnected,
}) => {
  const [view, setView] = useState<ViewType>('main');
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (currentRoom) {
      setView('lobby');
      console.log('MainMenu: Showing room lobby for room:', currentRoom.id);
    } else {
      setView('main');
      console.log('MainMenu: View changed to: main');
    }
  }, [currentRoom]);

  useEffect(() => {
    // Refresh rooms list periodically
    const interval = setInterval(() => {
      if (view === 'join' && isConnected) {
        refreshRooms();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [view, isConnected, refreshRooms]);

  const handleCreateRoom = () => {
    // Fixed: Using a local variable instead of reassigning the const
    let roomNameToUse = roomName.trim();
    if (!roomNameToUse) {
      roomNameToUse = `${playerName}'s Room`;
    }
    createRoom(roomNameToUse, isPublic);
    setRoomName('');
  };

  const filteredRooms = rooms.filter(room => 
    !room.inProgress && 
    room.isPublic && 
    (searchTerm === '' || 
     room.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Main menu view
  if (view === 'main') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-sm w-full">
          <h2 className="text-2xl font-bold text-center text-white mb-6">Snake Multiplayer</h2>
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
            
            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => setView('create')}
                disabled={!playerName.trim() || !isConnected}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="w-5 h-5" />
                Create Room
              </button>
              
              <button
                onClick={() => {
                  setView('join');
                  refreshRooms();
                }}
                disabled={!playerName.trim() || !isConnected}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Users className="w-5 h-5" />
                Join Room
              </button>
            </div>
            
            {!isConnected && (
              <div className="text-red-400 text-center text-sm mt-4">
                Connecting to server...
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  // Create room view
  if (view === 'create') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-sm w-full">
          <h2 className="text-xl font-bold text-center text-white mb-6">Create New Room</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="roomName" className="block text-sm font-medium text-white/80 mb-2">
                Room Name
              </label>
              <input
                type="text"
                id="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder={`${playerName}'s Room`}
                maxLength={20}
              />
            </div>
            
            <div className="flex items-center justify-between mt-4">
              <span className="text-white text-sm">Room Type:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPublic(true)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    isPublic ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  <span>Public</span>
                </button>
                <button
                  onClick={() => setIsPublic(false)}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    !isPublic ? 'bg-green-600' : 'bg-gray-700'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Private</span>
                </button>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setView('main')}
                className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreateRoom}
                disabled={!isConnected}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Join room view
  if (view === 'join') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
          <h2 className="text-xl font-bold text-center text-white mb-4">Join Room</h2>
          
          <div className="relative mb-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/60 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search rooms..."
            />
          </div>
          
          <div className="max-h-64 overflow-y-auto space-y-2 mb-4">
            {filteredRooms.length > 0 ? (
              filteredRooms.map(room => (
                <div
                  key={room.id}
                  className="flex items-center justify-between p-3 bg-gray-800/70 rounded-lg border border-white/10 hover:border-white/30"
                >
                  <div>
                    <div className="text-white font-medium">{room.name}</div>
                    <div className="text-white/60 text-sm">{room.players.length}/{room.maxPlayers} players</div>
                  </div>
                  <button
                    onClick={() => joinRoom(room.id)}
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Join
                  </button>
                </div>
              ))
            ) : (
              <div className="text-center text-white/60 py-6">
                {isConnected ? "No rooms available" : "Connecting to server..."}
              </div>
            )}
          </div>
          
          <div className="flex gap-3 mt-4">
            <button
              onClick={() => setView('main')}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={refreshRooms}
              disabled={!isConnected}
              className="flex items-center justify-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Room lobby view
  if (view === 'lobby' && currentRoom) {
    const isHost = currentRoom.hostId === localStorage.getItem('playerId');
    
    // Fixed: Moved currentPlayer declaration before it's used
    const currentPlayer = currentRoom.players.find(
      p => p.id === localStorage.getItem('playerId')
    );
    
    const allPlayersReady = currentRoom.players.length > 1 && 
                            currentPlayer?.isReady &&
                            currentRoom.players.every(p => p.isReady);
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-white">{currentRoom.name}</h2>
            <div className="flex items-center gap-2">
              {currentRoom.isPublic ? (
                <Globe className="w-4 h-4 text-green-400" />
              ) : (
                <Lock className="w-4 h-4 text-yellow-400" />
              )}
              <span className="text-white/70 text-sm">
                {currentRoom.players.length}/{currentRoom.maxPlayers}
              </span>
            </div>
          </div>
          
          <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
            {currentRoom.players.map(player => (
              <div 
                key={player.id} 
                className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {player.id === currentRoom.hostId && (
                    <span className="text-yellow-400 text-xs font-bold">HOST</span>
                  )}
                  <span className="text-white">{player.name}</span>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  player.isReady ? 'bg-green-500/30 text-green-300' : 'bg-gray-500/30 text-gray-300'
                }`}>
                  {player.isReady ? 'Ready' : 'Not Ready'}
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={leaveRoom}
              className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Leave
            </button>
            
            {isHost && allPlayersReady ? (
              <button
                onClick={() => toggleReady()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <ArrowRight className="w-4 h-4" />
                Start Game
              </button>
            ) : (
              <button
                onClick={toggleReady}
                className={`flex-1 px-4 py-2 ${
                  currentPlayer?.isReady 
                    ? 'bg-yellow-600 hover:bg-yellow-700' 
                    : 'bg-green-600 hover:bg-green-700'
                } text-white rounded-lg transition-colors`}
              >
                {currentPlayer?.isReady ? 'Cancel Ready' : 'Ready'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  return null;
};

export default MainMenu;

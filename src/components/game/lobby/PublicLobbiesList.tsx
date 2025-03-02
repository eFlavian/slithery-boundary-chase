
import React from 'react';
import { Button } from '@/components/ui/button';
import { PublicSession } from '@/lib/gameTypes';

type PublicLobbiesListProps = {
  publicSessions: PublicSession[];
  joinPublicSession: (sessionId: string) => void;
  playerNameValid: boolean;
};

const PublicLobbiesList: React.FC<PublicLobbiesListProps> = ({ 
  publicSessions, 
  joinPublicSession,
  playerNameValid
}) => {
  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold text-white mb-2">Public Lobbies</h3>
      <div className="max-h-60 overflow-y-auto rounded-lg border border-white/20">
        {publicSessions.length > 0 ? (
          <div className="divide-y divide-white/10">
            {publicSessions.map((session) => (
              <div key={session.id} className="p-3 flex justify-between items-center hover:bg-white/5">
                <div>
                  <p className="text-white font-medium">{session.hostName}'s Game</p>
                  <p className="text-xs text-white/70">{session.players.length} players</p>
                </div>
                <Button
                  onClick={() => joinPublicSession(session.id)}
                  className="bg-green-600 hover:bg-green-700 text-white text-sm py-1"
                  disabled={!playerNameValid}
                >
                  Join
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-white/60">
            No public lobbies available
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicLobbiesList;

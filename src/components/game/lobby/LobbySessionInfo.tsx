
import React from 'react';
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

type LobbySessionInfoProps = {
  sessionId: string;
};

const LobbySessionInfo: React.FC<LobbySessionInfoProps> = ({ sessionId }) => {
  const handleCopySessionId = () => {
    navigator.clipboard.writeText(sessionId)
      .then(() => toast.success('Session ID copied to clipboard!'))
      .catch(() => toast.error('Failed to copy session ID'));
  };
  
  const handleCopySessionLink = () => {
    const url = `${window.location.origin}?session=${sessionId}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Link copied to clipboard!'))
      .catch(() => toast.error('Failed to copy link'));
  };

  return (
    <div className="bg-gray-900/60 rounded-lg p-3 border border-white/20">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-medium text-white/80">Session ID</h3>
        <div className="flex gap-2">
          <button
            onClick={handleCopySessionId}
            className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-white/10"
            title="Copy session ID"
          >
            <Copy className="w-4 h-4" />
          </button>
        </div>
      </div>
      <p className="text-white font-mono break-all text-sm">{sessionId}</p>
      
      <div className="mt-3">
        <button
          onClick={handleCopySessionLink}
          className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-white/10 flex items-center gap-1"
        >
          <Copy className="w-3 h-3" /> Copy invite link
        </button>
      </div>
    </div>
  );
};

export default LobbySessionInfo;


import React, { useState, useEffect } from 'react';
import { Play, Copy, Eye, EyeOff, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import * as web3 from '@solana/web3.js';
import { Button } from '../ui/button';

type StartScreenProps = {
  playerName: string;
  setPlayerName: (name: string) => void;
  handleStartGame: () => void;
};

const StartScreen: React.FC<StartScreenProps> = ({ 
  playerName, 
  setPlayerName, 
  handleStartGame 
}) => {
  const [wallet, setWallet] = useState<web3.Keypair | null>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const ENTRY_FEE = 0.2; // SOL required to play
  
  // Create or retrieve wallet on component mount
  useEffect(() => {
    const storedWallet = localStorage.getItem('snakeWallet');
    
    if (storedWallet) {
      try {
        const keypairData = JSON.parse(storedWallet);
        const secretKey = new Uint8Array(keypairData.secretKey);
        const retrievedWallet = web3.Keypair.fromSecretKey(secretKey);
        setWallet(retrievedWallet);
      } catch (error) {
        console.error('Error loading wallet:', error);
        createNewWallet();
      }
    } else {
      createNewWallet();
    }
  }, []);
  
  // Check wallet balance when wallet is set
  useEffect(() => {
    if (wallet) {
      checkWalletBalance();
    }
  }, [wallet]);
  
  const createNewWallet = () => {
    const newWallet = web3.Keypair.generate();
    
    // Store wallet in localStorage
    localStorage.setItem('snakeWallet', JSON.stringify({
      publicKey: newWallet.publicKey.toString(),
      secretKey: Array.from(newWallet.secretKey)
    }));
    
    setWallet(newWallet);
    toast.success('New wallet created');
  };
  
  const checkWalletBalance = async () => {
    if (!wallet) return;
    
    try {
      setIsLoading(true);
      // Connect to Solana devnet
      const connection = new web3.Connection(web3.clusterApiUrl('devnet'));
      const balance = await connection.getBalance(wallet.publicKey);
      setWalletBalance(balance / web3.LAMPORTS_PER_SOL);
    } catch (error) {
      console.error('Error checking balance:', error);
      toast.error('Failed to check wallet balance');
    } finally {
      setIsLoading(false);
    }
  };
  
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(`${label} copied to clipboard`))
      .catch(() => toast.error('Failed to copy'));
  };
  
  const handlePlay = async () => {
    if (!playerName.trim()) {
      toast.error("Please enter a name first!");
      return;
    }
    
    if (!wallet) {
      toast.error("Wallet not initialized");
      return;
    }
    
    if (walletBalance < ENTRY_FEE) {
      toast.error(`Not enough SOL. You need at least ${ENTRY_FEE} SOL to play.`);
      return;
    }
    
    try {
      setIsLoading(true);
      // Process entry fee payment
      const connection = new web3.Connection(web3.clusterApiUrl('devnet'));
      
      // Server wallet public key (this would be set in a server environment)
      const serverPublicKey = new web3.PublicKey("8ezKrFGjDFZx9aBrRbdESVvQXqzyyeR3QFrLXRLdZzd9");
      
      // Create transaction
      const transaction = new web3.Transaction().add(
        web3.SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: serverPublicKey,
          lamports: ENTRY_FEE * web3.LAMPORTS_PER_SOL
        })
      );
      
      // Send and confirm transaction
      const signature = await web3.sendAndConfirmTransaction(
        connection,
        transaction,
        [wallet]
      );
      
      console.log('Transaction sent:', signature);
      
      // If payment successful, start game
      handleStartGame();
      await checkWalletBalance(); // Update balance after payment
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const privateKeyString = wallet 
    ? Buffer.from(wallet.secretKey).toString('hex')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 p-6 max-w-md w-full">
        <h2 className="text-2xl font-bold text-center text-white mb-6">Welcome to Snake Game</h2>
        
        {/* Wallet Info Section */}
        <div className="mb-6 p-4 bg-gray-900/60 rounded-lg border border-white/20">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-medium">Your Wallet</h3>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={checkWalletBalance}
              disabled={isLoading}
            >
              Refresh
            </Button>
          </div>
          
          {wallet && (
            <>
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Address:</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => copyToClipboard(wallet.publicKey.toString(), 'Address')}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-white text-xs bg-gray-800/70 p-2 rounded truncate">
                  {wallet.publicKey.toString()}
                </p>
              </div>
              
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/70 text-sm">Private Key:</span>
                  <div className="flex space-x-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowPrivateKey(!showPrivateKey)}
                    >
                      {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => copyToClipboard(privateKeyString, 'Private Key')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {showPrivateKey ? (
                  <p className="text-white text-xs bg-gray-800/70 p-2 rounded truncate">
                    {privateKeyString}
                  </p>
                ) : (
                  <p className="text-white text-xs bg-gray-800/70 p-2 rounded">
                    ••••••••••••••••••••••••••••••••••••••••
                  </p>
                )}
              </div>
              
              <div className="mb-2">
                <span className="text-white/70 text-sm">Balance:</span>
                <p className={`text-lg font-bold ${walletBalance >= ENTRY_FEE ? 'text-green-400' : 'text-red-400'}`}>
                  {walletBalance.toFixed(4)} SOL
                </p>
                {walletBalance < ENTRY_FEE && (
                  <p className="text-red-400 text-xs mt-1">
                    You need at least {ENTRY_FEE} SOL to play. Deposit SOL to this address.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
        
        {/* Player Name Input */}
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
          
          {/* Play Button */}
          <button
            onClick={handlePlay}
            disabled={isLoading || walletBalance < ENTRY_FEE}
            className={`w-full flex items-center justify-center gap-2 px-6 py-3 text-white rounded-lg transition-colors mt-4 ${
              walletBalance >= ENTRY_FEE && !isLoading 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-600 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Wallet className="w-5 h-5" />
                Play ({ENTRY_FEE} SOL)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartScreen;

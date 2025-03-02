
import { useEffect } from "react";
import GameBoard from "@/components/GameBoard";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

const Index = () => {
  // Prevent touch devices from zooming when double-tapping the game
  useEffect(() => {
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventZoom, { passive: false });
    
    // Add meta tag to prevent scaling
    const metaTag = document.createElement('meta');
    metaTag.name = 'viewport';
    metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(metaTag);
    
    return () => {
      document.removeEventListener('touchmove', preventZoom);
    };
  }, []);
  
  return (
    <>
      <GameBoard />
      <Toaster />
      <SonnerToaster position="top-right" />
    </>
  );
};

export default Index;

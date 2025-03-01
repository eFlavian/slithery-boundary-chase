
import { useEffect, useState } from "react";
import GameBoard from "@/components/GameBoard";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const isMobile = useIsMobile();
  const [isMobileOptimized, setIsMobileOptimized] = useState(false);
  
  // Prevent touch devices from zooming when double-tapping the game
  useEffect(() => {
    // Immediately prevent zooming on mobile devices
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('touchstart', preventZoom, { passive: false });
    
    // Add meta tag to prevent scaling
    const metaTag = document.createElement('meta');
    metaTag.name = 'viewport';
    metaTag.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(metaTag);
    
    // Mobile-specific optimizations
    if (isMobile) {
      // Apply mobile optimizations
      setIsMobileOptimized(true);
      
      // Remove unnecessary hover effects on mobile
      document.documentElement.classList.add('mobile-device');
      
      // Optimize event handling for mobile
      window.addEventListener('touchmove', e => e.preventDefault(), { passive: false });
    }
    
    return () => {
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('touchstart', preventZoom);
    };
  }, [isMobile]);
  
  return <GameBoard />;
};

export default Index;


import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // Check on initial render if we're on a mobile device
    if (typeof window !== 'undefined') {
      // First check if this is definitely a mobile device
      const isTouchDevice = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 ||
                           (navigator as any).msMaxTouchPoints > 0;
                           
      // Then check screen width
      const isSmallScreen = window.innerWidth < MOBILE_BREAKPOINT;
      
      // Return true if either condition is met
      return isTouchDevice || isSmallScreen;
    }
    return false;
  });

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    }
    
    // Use newer event listener pattern with fallback
    if (mql.addEventListener) {
      mql.addEventListener("change", onChange);
    } else {
      // @ts-ignore - Fallback for older browsers
      mql.addListener(onChange);
    }
    
    // Set initial value
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    
    return () => {
      if (mql.removeEventListener) {
        mql.removeEventListener("change", onChange);
      } else {
        // @ts-ignore - Fallback for older browsers
        mql.removeListener(onChange);
      }
    }
  }, []);

  return isMobile;
}

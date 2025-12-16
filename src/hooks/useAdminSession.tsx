import { useState, useEffect, useCallback, useRef } from "react";

const ADMIN_SESSION_KEY = "admin_session_timestamp";
const ADMIN_SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

export const useAdminSession = () => {
  const [isAdminSessionValid, setIsAdminSessionValid] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const checkAdminSession = useCallback(() => {
    const sessionTimestamp = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!sessionTimestamp) {
      setIsAdminSessionValid(false);
      return false;
    }

    const elapsed = Date.now() - parseInt(sessionTimestamp, 10);
    const isValid = elapsed < ADMIN_SESSION_TIMEOUT;
    setIsAdminSessionValid(isValid);
    
    if (!isValid) {
      localStorage.removeItem(ADMIN_SESSION_KEY);
    }
    
    return isValid;
  }, []);

  const createAdminSession = useCallback(() => {
    const now = Date.now();
    localStorage.setItem(ADMIN_SESSION_KEY, now.toString());
    lastActivityRef.current = now;
    setIsAdminSessionValid(true);
  }, []);

  const clearAdminSession = useCallback(() => {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAdminSessionValid(false);
  }, []);

  const resetIdleTimer = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    
    // Update session timestamp on activity
    if (isAdminSessionValid) {
      localStorage.setItem(ADMIN_SESSION_KEY, now.toString());
    }
  }, [isAdminSessionValid]);

  // Set up idle detection
  useEffect(() => {
    if (!isAdminSessionValid) return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    
    const handleActivity = () => {
      resetIdleTimer();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Check for idle timeout every minute
    idleTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= ADMIN_SESSION_TIMEOUT) {
        clearAdminSession();
      }
    }, 60000); // Check every minute

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      if (idleTimerRef.current) {
        clearInterval(idleTimerRef.current);
      }
    };
  }, [isAdminSessionValid, resetIdleTimer, clearAdminSession]);

  // Check session on mount
  useEffect(() => {
    checkAdminSession();
  }, [checkAdminSession]);

  return {
    isAdminSessionValid,
    checkAdminSession,
    createAdminSession,
    clearAdminSession,
    resetIdleTimer,
  };
};

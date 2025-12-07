// frontend/src/hooks/usePresenceHeartbeat.js
// ✅ NEW: Keeps user presence alive across all pages
import { useEffect } from "react";
import socketClient from "../lib/socket";

export const usePresenceHeartbeat = (user) => {
  useEffect(() => {
    if (!user?._id) return;

    let heartbeatInterval;
    let isActive = true;

    // ✅ Send heartbeat every 5 seconds
    const startHeartbeat = () => {
      heartbeatInterval = setInterval(() => {
        if (socketClient.connected && isActive) {
          socketClient.socket.emit("heartbeat", {
            userId: user._id,
            timestamp: Date.now(),
          });
        }
      }, 5000);
    };

    // ✅ Detect if user is active on page
    const handleActivity = () => {
      isActive = true;
    };

    const handleInactive = () => {
      isActive = false;
    };

    // Listen for user activity
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("click", handleActivity);
    window.addEventListener("scroll", handleActivity);
    window.addEventListener("blur", handleInactive);
    window.addEventListener("focus", handleActivity);

    // Start heartbeat
    startHeartbeat();

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("click", handleActivity);
      window.removeEventListener("scroll", handleActivity);
      window.removeEventListener("blur", handleInactive);
      window.removeEventListener("focus", handleActivity);
    };
  }, [user?._id]);
};

export default usePresenceHeartbeat;

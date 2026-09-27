import { useEffect, useRef } from 'react';
import { API_BASE } from './api';

function getWebSocketUrl(): string {
  if (API_BASE.startsWith('http://') || API_BASE.startsWith('https://')) {
    return API_BASE.replace(/^http/, 'ws');
  }
  
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}`;
}

export function useLeaderboardWebSocket(
  onUpdate: (event: { type: string; scope: string; pollLaunchId?: string }) => void
) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && typeof data === 'object' && data.type === 'LEADERBOARD_UPDATED') {
          onUpdateRef.current(data);
        }
      } catch (err) {
        // safely ignore malformed messages
      }
    };

    ws.onerror = () => {
      // safely ignore errors, fallback to REST
    };

    return () => {
      ws.close();
    };
  }, []);
}

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: Server) {
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    // Basic connection handling
    ws.on('error', console.error);

    ws.on('message', (data) => {
      // Ignore unexpected messages for Phase 1
    });
  });
}

export function broadcastLeaderboardUpdate(scope: 'overall'): void;
export function broadcastLeaderboardUpdate(scope: 'poll', pollLaunchId: string): void;
export function broadcastLeaderboardUpdate(scope: 'overall' | 'poll', pollLaunchId?: string) {
  if (!wss) return;

  const event = scope === 'overall' 
    ? { type: 'LEADERBOARD_UPDATED', scope: 'overall' }
    : { type: 'LEADERBOARD_UPDATED', scope: 'poll', pollLaunchId };

  const message = JSON.stringify(event);

  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (err) {
        console.error('Error sending WS message:', err);
      }
    }
  }
}

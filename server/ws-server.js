// Simple WebSocket state server (Node)
// Usage: node server/ws-server.js
// npm install ws
const WebSocket = require('ws');

const wss = new WebSocket.Server({ port: 8080 });
let state = {
  courts: Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    name: `Court ${i + 1}`,
    scoreHome: 0,
    scoreAway: 0,
    updatedAt: new Date().toISOString(),
  })),
};

function broadcast(obj) {
  const raw = JSON.stringify(obj);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) c.send(raw);
  });
}

wss.on('connection', (ws) => {
  console.log('client connected');
  ws.send(JSON.stringify({ type: 'state', courts: state.courts }));

  ws.on('message', (msg) => {
    try {
      const m = JSON.parse(msg);
      if (m.type === 'request_state') {
        ws.send(JSON.stringify({ type: 'state', courts: state.courts }));
      } else if (m.type === 'update' && m.court) {
        // update server state and broadcast
        state.courts = state.courts.map((c) => (c.id === m.court.id ? m.court : c));
        broadcast({ type: 'update', court: m.court });
      } else if (m.type === 'state' && Array.isArray(m.courts)) {
        state.courts = m.courts;
        broadcast({ type: 'state', courts: state.courts });
      }
    } catch (e) {
      console.error('bad message', e);
    }
  });

  ws.on('close', () => console.log('client disconnected'));
});

console.log('WebSocket server running on ws://localhost:8080');
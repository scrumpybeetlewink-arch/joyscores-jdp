import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Court } from '../types';
import CourtCard from './CourtCard';
import CombinedDisplay from './CombinedDisplay';
import './courts.css';

type Props = {
  wsUrl?: string; // optional WebSocket URL to broadcast/receive updates
};

const initialCourt = (id: number): Court => ({
  id,
  name: `Court ${id}`,
  scoreHome: 0,
  scoreAway: 0,
  updatedAt: new Date().toISOString(),
});

export const CourtsDashboard: React.FC<Props> = ({ wsUrl }) => {
  const [courts, setCourts] = useState<Court[]>(
    Array.from({ length: 5 }, (_, i) => initialCourt(i + 1))
  );

  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket if provided
  useEffect(() => {
    if (!wsUrl) return;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.addEventListener('open', () => {
      console.log('WS open');
      // Optional: request current state
      ws.send(JSON.stringify({ type: 'request_state' }));
    });

    ws.addEventListener('message', (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'state') {
          // full state
          setCourts(msg.courts);
        } else if (msg.type === 'update' && msg.court) {
          setCourts((prev) => prev.map((c) => (c.id === msg.court.id ? msg.court : c)));
        }
      } catch (e) {
        console.error('Invalid WS message', e);
      }
    });

    ws.addEventListener('close', () => {
      console.log('WS closed');
    });

    return () => {
      ws.close();
    };
  }, [wsUrl]);

  const broadcast = (payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(payload));
    }
  };

  const updateCourt = (id: number, patch: Partial<Court>) => {
    setCourts((prev) => {
      const next = prev.map((c) => (c.id === id ? { ...c, ...patch } : c));
      const updated = next.find((c) => c.id === id)!;
      // Broadcast the single-court update
      broadcast({ type: 'update', court: updated });
      return next;
    });
    // Optionally persist to backend here with fetch POST/PUT
  };

  const resetAll = () => {
    const reset = courts.map((c) => ({ ...c, scoreHome: 0, scoreAway: 0, updatedAt: new Date().toISOString() }));
    setCourts(reset);
    broadcast({ type: 'state', courts: reset });
  };

  const courtsList = useMemo(
    () => courts.map((c) => <CourtCard key={c.id} court={c} onUpdate={updateCourt} />),
    [courts]
  );

  return (
    <div className="courts-dashboard">
      <CombinedDisplay courts={courts} />
      <div className="controls-row">
        <button onClick={resetAll}>Reset All Courts</button>
      </div>
      <div className="courts-grid">{courtsList}</div>
    </div>
  );
};

export default CourtsDashboard;
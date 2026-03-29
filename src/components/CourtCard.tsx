import React from 'react';
import { Court } from '../types';
import './courts.css';

type Props = {
  court: Court;
  onUpdate: (id: number, patch: Partial<Court>) => void;
};

export const CourtCard: React.FC<Props> = ({ court, onUpdate }) => {
  const setHome = (v: number) => onUpdate(court.id, { scoreHome: Math.max(0, v), updatedAt: new Date().toISOString() });
  const setAway = (v: number) => onUpdate(court.id, { scoreAway: Math.max(0, v), updatedAt: new Date().toISOString() });

  return (
    <div className="court-card" role={`court-${court.id}`}> 
      <div className="court-header">
        <h3>{court.name}</h3>
        <small className="muted">Last: {new Date(court.updatedAt).toLocaleTimeString()}</small>
      </div>

      <div className="scores-row">
        <div className="team">
          <div className="team-label">Home</div>
          <div className="score">{court.scoreHome}</div>
          <div className="controls">
            <button onClick={() => setHome(court.scoreHome - 1)}>-</button>
            <button onClick={() => setHome(court.scoreHome + 1)}>+</button>
          </div>
        </div>

        <div className="team">
          <div className="team-label">Away</div>
          <div className="score">{court.scoreAway}</div>
          <div className="controls">
            <button onClick={() => setAway(court.scoreAway - 1)}>-</button>
            <button onClick={() => setAway(court.scoreAway + 1)}>+</button>
          </div>
        </div>
      </div>

      <div className="manual-set">
        <label>
          Set Home:
          <input
            type="number"
            value={court.scoreHome}
            onChange={(e) => setHome(parseInt(e.target.value || '0', 10))}
            min={0}
          />
        </label>
        <label>
          Set Away:
          <input
            type="number"
            value={court.scoreAway}
            onChange={(e) => setAway(parseInt(e.target.value || '0', 10))}
            min={0}
          />
        </label>
      </div>
    </div>
  );
};

export default CourtCard;
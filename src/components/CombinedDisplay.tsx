import React from 'react';
import { Court } from '../types';
import './courts.css';

type Props = {
  courts: Court[];
};

export const CombinedDisplay: React.FC<Props> = ({ courts }) => {
  const totals = courts.reduce(
    (acc, c) => {
      acc.home += c.scoreHome;
      acc.away += c.scoreAway;
      return acc;
    },
    { home: 0, away: 0 }
  );

  return (
    <div className="combined-display" role="combined-display">
      <h2>All Courts — Live Combined</h2>
      <div className="combined-scores">
        <div className="combined-team">
          <div className="team-label">Home Total</div>
          <div className="score-large">{totals.home}</div>
        </div>
        <div className="combined-team">
          <div className="team-label">Away Total</div>
          <div className="score-large">{totals.away}</div>
        </div>
      </div>
    </div>
  );
};

export default CombinedDisplay;
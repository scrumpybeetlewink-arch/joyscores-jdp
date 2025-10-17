import React from 'react';
import CourtsDashboard from '../components/CourtsDashboard';

const HomePage: React.FC = () => {
  // Replace with your deployed WS server or leave undefined if you don't want WS
  const wsUrl = typeof window !== 'undefined' ? 'ws://localhost:8080' : undefined;

  return (
    <main>
      <h1>Scoreboard</h1>
      <CourtsDashboard wsUrl={wsUrl} />
    </main>
  );
};

export default HomePage;
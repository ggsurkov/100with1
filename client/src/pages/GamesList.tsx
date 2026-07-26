import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import styles from './GamesList.module.scss';
import LaunchModal from './LaunchModal';

export default function GamesList() {
  const { hasPermission } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  useEffect(() => {
    api.get('/games').then(({ data }) => setGames(data));
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Select a Game</h1>
      <div className={styles.grid}>
        {games.map(game => (
          <div key={game._id} className={styles.card}>
            <h2>{game.title}</h2>
            <p>{game.description || 'No description available.'}</p>
            {hasPermission('CREATE') && (
              <button onClick={() => setSelectedGameId(game._id)} className={styles.startBtn}>
                Launch Game
              </button>
            )}
          </div>
        ))}
      </div>
      
      {selectedGameId && (
        <LaunchModal gameId={selectedGameId} onClose={() => setSelectedGameId(null)} />
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import styles from './GameRounds.module.scss';

export default function GameRounds() {
  const { id, launchId } = useParams();
  const [game, setGame] = useState<any>(null);
  const [launch, setLaunch] = useState<any>(null);

  useEffect(() => {
    if (launchId && launchId !== 'undefined') {
      api.get(`/launches/${launchId}`).then(({ data }) => {
        setLaunch(data);
        setGame(data.gameId); // gameId is populated by backend
      }).catch(() => console.error('Failed to load launch'));
    } else if (id && id !== 'undefined') {
      api.get(`/games/${id}`).then(({ data }) => setGame(data))
        .catch(() => console.error('Failed to load game'));
    }
  }, [id, launchId]);

  if (!game) return <div style={{padding: '2rem', color: 'white'}}>Loading...</div>;

  const sortedTeams = launch?.teamGameInfo 
    ? [...launch.teamGameInfo].sort((a, b) => b.teamPoints - a.teamPoints) 
    : [];

  return (
    <div className={styles.layout}>
      <div className={styles.container}>
        <h1 className={styles.title}>{game.title} - Rounds</h1>
        <div className={styles.list}>
          {game.rounds?.length === 0 && <p style={{textAlign: 'center', color: '#94a3b8'}}>No rounds available in this game.</p>}
          {game.rounds?.map((round: any, idx: number) => (
            <div key={round._id || idx} className={styles.roundCard}>
              <div className={styles.info}>
                <strong>Round {round.orderNumber || idx + 1}</strong>
                <span>{round.hint}</span>
              </div>
              <div className={styles.actions}>
                <Link to={launchId ? `/launch/${launchId}/round/${round._id || idx}/start` : `/game/${game._id}/round/${round._id || idx}/start`} className={styles.startBtn}>Start</Link>
                <Link to={launchId ? `/launch/${launchId}/round/${round._id || idx}/check` : `/game/${game._id}/round/${round._id || idx}/check`} className={styles.checkBtn}>Check</Link>
              </div>
            </div>
          ))}
        </div>
        <Link to="/games" className={styles.backLink}>Back to Games</Link>
      </div>

      {launch && (
        <div className={styles.sidebar}>
          <h2>Scoring Board</h2>
          <div className={styles.scoringList}>
            {sortedTeams.map((t, i) => (
              <div key={t.teamId} className={styles.scoreItem}>
                <span className={styles.rank}>#{i + 1}</span>
                <span className={styles.teamTitle}>{t.teamTitle}</span>
                <span className={styles.teamPoints}>{t.teamPoints} pts</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

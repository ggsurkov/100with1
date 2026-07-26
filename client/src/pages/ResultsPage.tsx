import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import styles from './ResultsPage.module.scss';

interface TeamGameInfo {
  teamId: string;
  teamTitle: string;
  teamPoints: number;
}

interface FinishedLaunch {
  _id: string;
  gameId: { _id: string; title: string } | null;
  teamGameInfo: TeamGameInfo[];
  status: string;
  createdAt?: string;
  updatedAt?: string;
}

export default function ResultsPage() {
  const [launches, setLaunches] = useState<FinishedLaunch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/launches', { params: { status: 'finished' } })
      .then(({ data }) => setLaunches(data))
      .catch(() => setLaunches([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Завершенные игры PintaGames</h1>

        {loading && <p className={styles.emptyState}>Загрузка...</p>}

        {!loading && launches.length === 0 && (
          <p className={styles.emptyState}>Пока нет завершенных игр.</p>
        )}

        <div className={styles.list}>
          {launches.map(launch => {
            const teams = [...(launch.teamGameInfo || [])].sort((a, b) => b.teamPoints - a.teamPoints);
            const topScore = teams[0]?.teamPoints;
            const date = launch.updatedAt || launch.createdAt;

            return (
              <div key={launch._id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <h2 className={styles.gameTitle}>{launch.gameId?.title || 'Игра удалена'}</h2>
                  <span className={styles.gameDate}>
                    {date ? new Date(date).toLocaleDateString() : '—'}
                  </span>
                </div>
                <div className={styles.teamList}>
                  {teams.map((team, idx) => {
                    const isWinner = team.teamPoints === topScore && topScore !== undefined;
                    return (
                      <div
                        key={team.teamId}
                        className={`${styles.teamRow} ${isWinner ? styles.winner : ''}`}
                      >
                        <span className={styles.teamName}>
                          {isWinner && '🏆 '}
                          #{idx + 1} {team.teamTitle}
                        </span>
                        <span className={styles.teamPoints}>{team.teamPoints} pts</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.backLinkWrap}>
          <Link to="/" className={styles.backLink}>
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

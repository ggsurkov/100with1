import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import ScoreboardModal from '../components/ScoreboardModal';
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
  finishedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

function launchTimestamp(launch: FinishedLaunch): number {
  const date = launch.finishedAt || launch.updatedAt || launch.createdAt;
  return date ? new Date(date).getTime() : 0;
}

export default function ResultsPage() {
  const [launches, setLaunches] = useState<FinishedLaunch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLaunch, setSelectedLaunch] = useState<FinishedLaunch | null>(null);

  useEffect(() => {
    api
      .get('/launches', { params: { status: 'finished' } })
      .then(({ data }) => setLaunches(data))
      .catch(() => setLaunches([]))
      .finally(() => setLoading(false));
  }, []);

  const sortedLaunches = [...launches].sort((a, b) => launchTimestamp(b) - launchTimestamp(a));

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Завершенные игры PintaGames</h1>

        {loading && <p className={styles.emptyState}>Загрузка...</p>}

        {!loading && sortedLaunches.length === 0 && (
          <p className={styles.emptyState}>Пока нет завершенных игр.</p>
        )}

        <div className={styles.list}>
          {sortedLaunches.map(launch => {
            const teams = [...(launch.teamGameInfo || [])].sort((a, b) => b.teamPoints - a.teamPoints);
            const topScore = teams[0]?.teamPoints;
            const date = launch.finishedAt || launch.updatedAt || launch.createdAt;

            return (
              <div
                key={launch._id}
                className={styles.card}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedLaunch(launch)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedLaunch(launch);
                  }
                }}
              >
                <div className={styles.cardHeader}>
                  <h2 className={styles.gameTitle}>{launch.gameId?.title || 'Игра удалена'}</h2>
                  <span className={styles.gameDate}>
                    {date ? new Date(date).toLocaleString() : '—'}
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

      {selectedLaunch && (
        <ScoreboardModal launch={selectedLaunch} onClose={() => setSelectedLaunch(null)} />
      )}
    </div>
  );
}

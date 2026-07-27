import React, { useEffect, useState } from 'react';
import { useParams, Link, Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Launch } from '../types/launch';
import { themeClassFor } from '../styles/themes';
import FinishGameButton from '../components/FinishGameButton';
import styles from './GameRounds.module.scss';

export default function GameRounds() {
  const { id, launchId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [launch, setLaunch] = useState<Launch | null>(null);
  const [viewRoundIndex, setViewRoundIndex] = useState(0);
  const [updatingActiveRound, setUpdatingActiveRound] = useState(false);

  const isAuthorized = !!user && (user.role === 'admin' || user.role === 'master');

  useEffect(() => {
    if (user && !isAuthorized) {
      toast.error('Access denied: rounds control is restricted to admins and masters');
    }
  }, [user, isAuthorized]);

  useEffect(() => {
    if (!isAuthorized) return;
    if (launchId && launchId !== 'undefined') {
      api.get(`/launches/${launchId}`).then(({ data }) => {
        setLaunch(data);
        setGame(data.gameId); // gameId is populated by backend
      }).catch(() => console.error('Failed to load launch'));
    } else if (id && id !== 'undefined') {
      api.get(`/games/${id}`).then(({ data }) => setGame(data))
        .catch(() => console.error('Failed to load game'));
    }
  }, [id, launchId, isAuthorized]);

  useEffect(() => {
    setViewRoundIndex(0);
  }, [game?._id]);

  if (!user) return <Navigate to="/auth" replace />;
  if (!isAuthorized) return <Navigate to="/games" replace />;

  if (!game) return <div className={styles.status}>Loading...</div>;

  const rounds = game.rounds || [];
  const round = rounds[viewRoundIndex];
  const roundId = round?._id || String(viewRoundIndex);
  const isActiveRound = !!launch && !!round && launch.currentRoundId === round._id;

  const sortedTeams = launch?.teamGameInfo
    ? [...launch.teamGameInfo].sort((a, b) => b.teamPoints - a.teamPoints)
    : [];

  const themeClass = themeClassFor(launch?.gameType ?? game.type);

  const goToRound = async (mode: 'start' | 'check') => {
    if (launch && launchId && round?._id && launch.currentRoundId !== round._id) {
      setUpdatingActiveRound(true);
      try {
        await api.put(`/launches/${launchId}`, { currentRoundId: round._id });
        setLaunch(prev => (prev ? { ...prev, currentRoundId: round._id } : prev));
      } catch {
        toast.error('Failed to update active round');
      } finally {
        setUpdatingActiveRound(false);
      }
    }
    navigate(launchId ? `/launch/${launchId}/round/${roundId}/${mode}` : `/game/${game._id}/round/${roundId}/${mode}`);
  };

  return (
    <div className={`${styles.page} ${themeClass}`}>
      {launch && (
        <div className={styles.topBar}>
          <FinishGameButton launchId={launchId} />
        </div>
      )}
      <div className={styles.container}>
        <h1 className={styles.title}>{game.title}</h1>

        {launch && (
          <section className={styles.scoreBoard}>
            <h2>Scoring Board</h2>
            <div className={styles.scoringList}>
              {sortedTeams.map((t, i) => (
                <div key={t.teamId} className={styles.scoreItem}>
                  <span className={styles.rank}>#{i + 1}</span>
                  <span className={styles.teamTitle}>{t.teamTitle}</span>
                  <span className={styles.teamPoints}>{t.teamPoints} pts</span>
                </div>
              ))}
              {sortedTeams.length === 0 && <p className={styles.empty}>No teams joined yet.</p>}
            </div>
          </section>
        )}

        <section className={styles.controllerSection}>
          {rounds.length === 0 ? (
            <p className={styles.empty}>No rounds available in this game.</p>
          ) : (
            <div className={styles.pagerRow}>
              <button
                type="button"
                className={styles.arrowBtn}
                onClick={() => setViewRoundIndex(i => Math.max(0, i - 1))}
                disabled={viewRoundIndex === 0}
                aria-label="Previous round"
              >
                &#9664;
              </button>

              <div className={`${styles.controllerCard} ${isActiveRound ? styles.active : styles.inactive}`}>
                {isActiveRound && <span className={styles.activeBadge}>&#9679; Active</span>}
                <div className={styles.roundName}>Round {round.orderNumber || viewRoundIndex + 1}</div>
                {round.hint && <div className={styles.roundHint}>{round.hint}</div>}
                <div className={styles.actionsRow}>
                  <button
                    type="button"
                    className={styles.startBtn}
                    onClick={() => goToRound('start')}
                    disabled={updatingActiveRound}
                  >
                    Start
                  </button>
                  <button
                    type="button"
                    className={styles.checkBtn}
                    onClick={() => goToRound('check')}
                    disabled={updatingActiveRound}
                  >
                    Check
                  </button>
                </div>
              </div>

              <button
                type="button"
                className={styles.arrowBtn}
                onClick={() => setViewRoundIndex(i => Math.min(rounds.length - 1, i + 1))}
                disabled={viewRoundIndex === rounds.length - 1}
                aria-label="Next round"
              >
                &#9654;
              </button>
            </div>
          )}
          {rounds.length > 0 && (
            <div className={styles.pageIndicator}>
              Round {viewRoundIndex + 1} of {rounds.length}
            </div>
          )}
        </section>

        <Link to="/games" className={styles.backLink}>Back to Games</Link>
      </div>
    </div>
  );
}

import React, { useEffect } from 'react';
import styles from './ScoreboardModal.module.scss';

interface TeamGameInfo {
  teamId: string;
  teamTitle: string;
  teamPoints: number;
}

export interface ScoreboardLaunch {
  _id: string;
  gameId: { _id: string; title: string } | null;
  teamGameInfo: TeamGameInfo[];
  finishedAt?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface ScoreboardModalProps {
  launch: ScoreboardLaunch;
  onClose: () => void;
}

export default function ScoreboardModal({ launch, onClose }: ScoreboardModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const teams = [...(launch.teamGameInfo || [])].sort((a, b) => b.teamPoints - a.teamPoints);
  const topScore = teams[0]?.teamPoints;
  const date = launch.finishedAt || launch.updatedAt || launch.createdAt;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label="Закрыть">
          ✕
        </button>

        <div className={styles.header}>
          <h2 className={styles.gameTitle}>{launch.gameId?.title || 'Игра удалена'}</h2>
          <span className={styles.date}>{date ? new Date(date).toLocaleString() : '—'}</span>
        </div>

        <div className={styles.board}>
          {teams.map((team, idx) => {
            const isWinner = team.teamPoints === topScore && topScore !== undefined;
            return (
              <div key={team.teamId} className={`${styles.row} ${isWinner ? styles.winner : ''}`}>
                <span className={styles.rank}>{isWinner ? '🏆' : `#${idx + 1}`}</span>
                <span className={styles.teamTitle}>{team.teamTitle}</span>
                <span className={styles.teamPoints}>{team.teamPoints} pts</span>
              </div>
            );
          })}
          {teams.length === 0 && <p className={styles.empty}>Нет данных о командах.</p>}
        </div>

        <button type="button" className={styles.closeFooterBtn} onClick={onClose}>
          Закрыть
        </button>
      </div>
    </div>
  );
}

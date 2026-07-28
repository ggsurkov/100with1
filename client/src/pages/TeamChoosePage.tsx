import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import publicApi from '../services/publicApi';
import { forceMute } from '../utils/audio';
import styles from './TeamChoosePage.module.scss';

interface TeamOption {
  teamId: string;
  teamTitle: string;
  capitanActive: boolean;
}

const LAUNCH_KEY = 'pinta_launch_id';
const TEAM_KEY = 'pinta_team_id';
const TEAM_TITLE_KEY = 'pinta_team_title';

export default function TeamChoosePage() {
  const { launchId } = useParams();
  const navigate = useNavigate();
  const [gameTitle, setGameTitle] = useState('');
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [pinTeam, setPinTeam] = useState<TeamOption | null>(null);
  const [pin, setPin] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Captains never hear host sound effects (reveal gong, timer music) — force-mute on entry.
  useEffect(() => {
    forceMute();
  }, []);

  useEffect(() => {
    if (!launchId) return;

    const storedLaunchId = localStorage.getItem(LAUNCH_KEY);
    const storedTeamId = localStorage.getItem(TEAM_KEY);
    if (storedLaunchId === launchId && storedTeamId) {
      navigate(`/launch/${launchId}/play`, { replace: true });
      return;
    }

    publicApi.get(`/launches/${launchId}/teams`)
      .then(({ data }) => {
        setGameTitle(data.gameTitle || '');
        setTeams(data.teams || []);
      })
      .catch(() => toast.error('Не удалось загрузить список команд'))
      .finally(() => setLoading(false));
  }, [launchId, navigate]);

  const closePinModal = () => {
    if (submitting) return;
    setPinTeam(null);
    setPin('');
  };

  const handleJoin = async () => {
    if (!pinTeam || !launchId) return;
    if (pin.length !== 4) {
      toast.error('Введите 4-значный PIN-код');
      return;
    }
    setSubmitting(true);
    try {
      await publicApi.post(`/launches/${launchId}/join`, { teamId: pinTeam.teamId, pin });
      localStorage.setItem(LAUNCH_KEY, launchId);
      localStorage.setItem(TEAM_KEY, pinTeam.teamId);
      localStorage.setItem(TEAM_TITLE_KEY, pinTeam.teamTitle);
      navigate(`/launch/${launchId}/play`, { replace: true });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Неверный PIN-код');
      setSubmitting(false);
    }
  };

  if (loading) return <div className={styles.status}>Загрузка...</div>;

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>{gameTitle || 'PintaGames'}</h1>
        <p className={styles.subtitle}>Капитаны, выберите свою команду</p>

        <div className={styles.teamGrid}>
          {teams.map(team => (
            <button
              key={team.teamId}
              type="button"
              className={styles.teamBtn}
              disabled={team.capitanActive}
              onClick={() => { setPinTeam(team); setPin(''); }}
            >
              {team.teamTitle}
              {team.capitanActive && <span className={styles.taken}>занято</span>}
            </button>
          ))}
          {teams.length === 0 && <p className={styles.empty}>Команды не найдены.</p>}
        </div>
      </div>

      {pinTeam && (
        <div className={styles.overlay} onClick={closePinModal}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>{pinTeam.teamTitle}</h2>
            <p className={styles.modalHint}>Введите 4-значный PIN-код команды</p>
            <input
              className={styles.pinInput}
              value={pin}
              onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              autoFocus
              placeholder="••••"
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.cancelBtn} onClick={closePinModal} disabled={submitting}>
                Отмена
              </button>
              <button
                type="button"
                className={styles.joinBtn}
                onClick={handleJoin}
                disabled={submitting || pin.length !== 4}
              >
                {submitting ? 'Вход...' : 'Войти'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import publicApi from '../services/publicApi';
import { optimizeCloudinaryUrl } from '../utils/image';
import { forceMute } from '../utils/audio';
import styles from './CaptainPlayPage.module.scss';

const LAUNCH_KEY = 'pinta_launch_id';
const TEAM_KEY = 'pinta_team_id';
const TEAM_TITLE_KEY = 'pinta_team_title';

interface LaunchState {
  launchId: string;
  currentRoundId: string | null;
  currentQuestionId: string | null;
  isTimerActive: boolean;
  question: { title: string; imageUrl?: string } | null;
}

export default function CaptainPlayPage() {
  const { launchId } = useParams();
  const navigate = useNavigate();
  const teamId = localStorage.getItem(TEAM_KEY);
  const teamTitle = localStorage.getItem(TEAM_TITLE_KEY);

  const [state, setState] = useState<LaunchState | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const [submittedQuestionIds, setSubmittedQuestionIds] = useState<Set<string>>(new Set());
  const [cheatBlockedQuestionIds, setCheatBlockedQuestionIds] = useState<Set<string>>(new Set());
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const lastQuestionRef = useRef<string | null>(null);

  // Captains never hear host sound effects (reveal gong, timer music) — force-mute on entry.
  useEffect(() => {
    forceMute();
  }, []);

  // Bounce back to the join screen if this device never joined this launch.
  useEffect(() => {
    if (!launchId) return;
    const storedLaunchId = localStorage.getItem(LAUNCH_KEY);
    if (storedLaunchId !== launchId || !teamId) {
      navigate(`/launch/${launchId}/join`, { replace: true });
    }
  }, [launchId, teamId, navigate]);

  // Poll host state every 3s.
  useEffect(() => {
    if (!launchId) return;
    let cancelled = false;

    const poll = () => {
      publicApi.get(`/launches/${launchId}/state`)
        .then(({ data }) => {
          if (!cancelled) setState(data);
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [launchId]);

  // Reset the answer draft whenever the host moves to a new question.
  useEffect(() => {
    const qId = state?.currentQuestionId || null;
    if (qId !== lastQuestionRef.current) {
      lastQuestionRef.current = qId;
      setAnswerText('');
    }
  }, [state?.currentQuestionId]);

  // Fullscreen API is unsupported on iOS Safari (only "add to home screen" gives
  // fullscreen there, via the manifest) — detect once rather than calling an
  // undefined method on every tap.
  const [isFullscreenSupported] = useState(
    () => typeof document !== 'undefined'
      && !!(document.documentElement.requestFullscreen || (document.documentElement as any).webkitRequestFullscreen)
  );
  const [isFullscreen, setIsFullscreen] = useState(() => !!document.fullscreenElement);

  const requestFullscreen = useCallback(() => {
    if (document.fullscreenElement) return;
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    }
  }, []);

  // Track real fullscreen state (the browser can exit it on its own — address
  // bar reappearing, orientation change, OS gesture — independent of our calls).
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Tap-to-fullscreen welcome overlay — the first, most explicit user gesture
  // available, so the fullscreen request is as reliable as possible.
  const [showFullscreenOverlay, setShowFullscreenOverlay] = useState(() => !document.fullscreenElement);

  useEffect(() => {
    if (isFullscreen) setShowFullscreenOverlay(false);
  }, [isFullscreen]);

  const enterFullscreenFromOverlay = () => {
    requestFullscreen();
    setShowFullscreenOverlay(false);
  };

  // Re-enter fullscreen on every tap while not already in it — unlike a
  // one-shot `{ once: true }` listener, this recovers automatically if the
  // browser drops out of fullscreen mid-game.
  useEffect(() => {
    if (!isFullscreenSupported) return;
    document.addEventListener('click', requestFullscreen);
    return () => document.removeEventListener('click', requestFullscreen);
  }, [isFullscreenSupported, requestFullscreen]);

  // Guard against accidental exits via the system back gesture/button.
  useEffect(() => {
    window.history.pushState(null, '', window.location.href);
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
      setShowExitConfirm(true);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Anti-cheat: lock the current question if the captain leaves the tab/app
  // while it's live — a common Google-the-answer pattern.
  useEffect(() => {
    const questionId = state?.currentQuestionId;
    const isTimerActive = state?.isTimerActive;
    if (!questionId || !isTimerActive) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setSubmittedQuestionIds(prev => new Set(prev).add(questionId));
        setCheatBlockedQuestionIds(prev => new Set(prev).add(questionId));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state?.currentQuestionId, state?.isTimerActive]);

  const handleSubmit = async () => {
    if (!launchId || !teamId || !state?.currentRoundId || !state?.currentQuestionId || !answerText.trim()) return;
    setSubmitting(true);
    try {
      await publicApi.put(`/launches/${launchId}/answers`, {
        teamId,
        roundId: state.currentRoundId,
        questionId: state.currentQuestionId,
        answerText: answerText.trim(),
      });
      const questionId = state.currentQuestionId;
      setSubmittedQuestionIds(prev => new Set(prev).add(questionId));
    } catch {
      toast.error('Не удалось отправить ответ');
    } finally {
      setSubmitting(false);
    }
  };

  if (!launchId || !teamId) return null;

  const hasQuestion = !!state?.question && !!state?.currentQuestionId;
  const canAnswer = !!state?.isTimerActive;
  const isSubmittedForCurrent = !!state?.currentQuestionId && submittedQuestionIds.has(state.currentQuestionId);
  const isCheatBlockedForCurrent = !!state?.currentQuestionId && cheatBlockedQuestionIds.has(state.currentQuestionId);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.teamBadge}>{teamTitle || 'Команда'}</span>
        {isFullscreenSupported && !isFullscreen && (
          <button
            type="button"
            className={styles.fullscreenBtn}
            onClick={requestFullscreen}
          >
            ⛶ На весь экран
          </button>
        )}
      </div>

      {!hasQuestion ? (
        <div className={styles.waiting}>
          <div className={styles.spinner} />
          <p>Ожидайте начала следующего вопроса...</p>
        </div>
      ) : (
        <div className={styles.questionCard}>
          <h2 className={styles.questionTitle}>{state!.question!.title}</h2>

          {state!.question!.imageUrl && (
            <img
              src={optimizeCloudinaryUrl(state!.question!.imageUrl)}
              alt=""
              className={styles.questionImage}
              onClick={() => setLightbox(true)}
            />
          )}

          <div className={styles.answerBlock}>
            <input
              className={styles.answerInput}
              value={answerText}
              onChange={e => setAnswerText(e.target.value)}
              placeholder="Ваш ответ..."
              disabled={!canAnswer || isSubmittedForCurrent}
            />
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!canAnswer || submitting || !answerText.trim() || isSubmittedForCurrent}
            >
              Отправить ответ
            </button>

            {isCheatBlockedForCurrent ? (
              <div className={styles.cheatBadge}>
                Зафиксирован уход со страницы (переключение вкладок). Ответ на этот вопрос заблокирован в целях защиты от поиска в интернете!
              </div>
            ) : isSubmittedForCurrent ? (
              <div className={styles.savedBadge}>Ваш ответ принят и зафиксирован ✓</div>
            ) : !canAnswer ? (
              <div className={styles.closedBadge}>Прием ответов закрыт</div>
            ) : null}
          </div>
        </div>
      )}

      {lightbox && state?.question?.imageUrl && (
        <div className={styles.lightbox} onClick={() => setLightbox(false)}>
          <img src={optimizeCloudinaryUrl(state.question.imageUrl)} alt="" />
        </div>
      )}

      {showExitConfirm && (
        <div className={styles.exitModalOverlay} onClick={() => setShowExitConfirm(false)}>
          <div className={styles.exitModal} onClick={e => e.stopPropagation()}>
            <p className={styles.exitModalTitle}>Вы уверены, что хотите выйти из игры?</p>
            <div className={styles.exitModalActions}>
              <button
                type="button"
                className={styles.exitModalCancel}
                onClick={() => setShowExitConfirm(false)}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.exitModalConfirm}
                onClick={() => {
                  setShowExitConfirm(false);
                  localStorage.removeItem(LAUNCH_KEY);
                  localStorage.removeItem(TEAM_KEY);
                  localStorage.removeItem(TEAM_TITLE_KEY);
                  navigate('/');
                }}
              >
                Да, выйти
              </button>
            </div>
          </div>
        </div>
      )}

      {showFullscreenOverlay && (
        <div className={styles.fullscreenOverlay}>
          <div className={styles.fullscreenOverlayCard}>
            <p className={styles.fullscreenOverlayText}>
              Добро пожаловать в PintaGames! Нажмите кнопку ниже, чтобы войти в полноэкранный режим.
            </p>
            <button
              type="button"
              className={styles.fullscreenOverlayBtn}
              onClick={enterFullscreenFromOverlay}
            >
              Войти в игру (Fullscreen)
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

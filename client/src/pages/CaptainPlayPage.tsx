import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import publicApi from '../services/publicApi';
import { optimizeCloudinaryUrl } from '../utils/image';
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
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const lastQuestionRef = useRef<string | null>(null);

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
      setSaved(false);
    }
  }, [state?.currentQuestionId]);

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
      setSaved(true);
    } catch {
      toast.error('Не удалось отправить ответ');
    } finally {
      setSubmitting(false);
    }
  };

  if (!launchId || !teamId) return null;

  const hasQuestion = !!state?.question && !!state?.currentQuestionId;
  const canAnswer = !!state?.isTimerActive;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.teamBadge}>{teamTitle || 'Команда'}</span>
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
              onChange={e => { setAnswerText(e.target.value); setSaved(false); }}
              placeholder="Ваш ответ..."
              disabled={!canAnswer}
            />
            <button
              type="button"
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!canAnswer || submitting || !answerText.trim()}
            >
              Отправить ответ
            </button>

            {!canAnswer && <div className={styles.closedBadge}>Прием ответов закрыт</div>}
            {canAnswer && saved && <div className={styles.savedBadge}>Ваш ответ сохранен ✓</div>}
          </div>
        </div>
      )}

      {lightbox && state?.question?.imageUrl && (
        <div className={styles.lightbox} onClick={() => setLightbox(false)}>
          <img src={optimizeCloudinaryUrl(state.question.imageUrl)} alt="" />
        </div>
      )}
    </div>
  );
}

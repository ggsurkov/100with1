import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import styles from './RoundStart.module.scss';
import { optimizeCloudinaryUrl } from '../utils/image';
import { startTimerMusic, stopTimerMusic, isMuted, toggleMute, playTestSound } from '../utils/audio';

export default function RoundStart() {
  const { id, roundId, launchId } = useParams();
  const navigate = useNavigate();

  const [game, setGame] = useState<any>(null);
  const [qIndex, setQIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const [muted, setMuted] = useState(isMuted());
  const intervalRef = useRef<any>(null);

  // Timer music follows the running state — covers manual Start/Stop,
  // auto-stop at 0 (which sets running=false), and unmount on nav-away.
  useEffect(() => {
    if (running) startTimerMusic();
    else stopTimerMusic();
  }, [running]);

  useEffect(() => stopTimerMusic, []);

  // Fetch game data — from launch (populated) or directly
  useEffect(() => {
    if (launchId && launchId !== 'undefined') {
      api.get(`/launches/${launchId}`).then(({ data }) => {
        setGame(data.gameId);
      }).catch(() => console.error('Failed to load launch'));
    } else if (id && id !== 'undefined') {
      api.get(`/games/${id}`).then(({ data }) => setGame(data))
        .catch(() => console.error('Failed to load game'));
    }
  }, [id, launchId]);

  // Find the round and current question
  const round = game?.rounds?.find(
    (r: any, idx: number) => r._id === roundId || idx.toString() === roundId
  );
  const questions = round?.questions || [];
  const question = questions[qIndex];

  // Sync timer when question changes (after data is loaded)
  useEffect(() => {
    if (!question) return;
    clearInterval(intervalRef.current);
    setRunning(false);
    setTimeLeft(question.timer ?? 60);
  }, [question?._id, qIndex]); // re-run when question identity changes

  // Countdown interval
  useEffect(() => {
    if (!running || timeLeft === null) return;
    if (timeLeft <= 0) {
      setRunning(false);
      return;
    }
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running]);

  // Loading state
  if (!game) return <div style={{ padding: '2rem', color: 'white' }}>Loading...</div>;
  if (!round || questions.length === 0) return <div style={{ padding: '2rem', color: 'white' }}>No questions in this round.</div>;
  if (!question || timeLeft === null) return <div style={{ padding: '2rem', color: 'white' }}>Loading question...</div>;

  const isLastQuestion = qIndex >= questions.length - 1;
  const backPath = launchId ? `/launch/${launchId}/rounds` : `/game/${id}/rounds`;

  const handleNext = () => {
    clearInterval(intervalRef.current);
    if (!isLastQuestion) {
      setQIndex(prev => prev + 1);
      // timer is reset by the useEffect above when qIndex changes
    } else {
      navigate(backPath);
    }
  };

  return (
    <div className={styles.fullscreen}>
      <div className={styles.audioControls}>
        <button type="button" className={styles.testSoundBtn} onClick={() => playTestSound()}>
          🔊 Проверить звук
        </button>
        <button
          type="button"
          className={styles.muteBtn}
          onClick={() => setMuted(toggleMute())}
        >
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
      <div className={styles.card}>
        <div className={styles.progress}>
          Question {qIndex + 1} / {questions.length}
        </div>

        <h2 className={styles.question}>{question.title}</h2>

        {question.imageUrl && (
          <img src={optimizeCloudinaryUrl(question.imageUrl)} alt="" className={styles.questionImage} />
        )}

        {timeLeft > 0 ? (
          <div className={`${styles.timer} ${timeLeft <= 10 ? styles.danger : ''}`}>
            {timeLeft}s
          </div>
        ) : (
          <div className={styles.timesUp}>Time's Up!</div>
        )}

        <div className={styles.controls}>
          {timeLeft > 0 && (
            <button
              onClick={() => setRunning(r => !r)}
              className={running ? styles.stop : styles.start}
            >
              {running ? 'Stop' : 'Start'}
            </button>
          )}
          <button onClick={handleNext} className={styles.next}>
            {isLastQuestion ? 'End Round' : 'Next Question'}
          </button>
        </div>

        <Link to={backPath} className={styles.backLink}>Back to Rounds</Link>
      </div>
    </div>
  );
}

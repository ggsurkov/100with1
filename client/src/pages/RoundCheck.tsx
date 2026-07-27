import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import styles from './RoundCheck.module.scss';
import { optimizeCloudinaryUrl } from '../utils/image';
import { playRevealSound, isMuted, toggleMute, playTestSound } from '../utils/audio';
import { themeClassFor } from '../styles/themes';
import FinishGameButton from '../components/FinishGameButton';

const MOCK_CAPTAIN_TEAMS = [
  { id: 'mock-a', title: 'Команда А' },
  { id: 'mock-b', title: 'Команда Б' },
  { id: 'mock-c', title: 'Команда В' },
];

export default function RoundCheck() {
  const { id, roundId, launchId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [game, setGame] = useState<any>(null);
  const [launch, setLaunch] = useState<any>(null);
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  // assignedAnswers: teamId -> official answer._id the host matched that team's submission to
  const [assignedAnswers, setAssignedAnswers] = useState<Record<string, string>>({});
  const [openCaptainPopover, setOpenCaptainPopover] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [muted, setMuted] = useState(isMuted());
  const [captainAnswers, setCaptainAnswers] = useState<any[]>([]);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (launchId && launchId !== 'undefined') {
      api.get(`/launches/${launchId}`).then(({ data }) => {
        setLaunch(data);
        setGame(data.gameId);
      }).catch(() => console.error('Failed to load launch'));
    } else if (id && id !== 'undefined') {
      api.get(`/games/${id}`).then(({ data }) => setGame(data))
        .catch(() => console.error('Failed to load game'));
    }
  }, [id, launchId]);

  // Close popover on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenCaptainPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const themeClass = themeClassFor(launch?.gameType ?? game?.type);

  const round = game?.rounds?.find((r: any, idx: number) => r._id === roundId || idx.toString() === roundId);
  const questions = round?.questions || [];
  const question = questions[qIndex];
  const teams: any[] = launch?.teamGameInfo || [];

  // Tell captains' phones which question the host is checking, and lock answer input.
  useEffect(() => {
    if (!launch || !launchId || !question?._id) return;
    api.put(`/launches/${launchId}`, { currentQuestionId: question._id, isTimerActive: false }).catch(() => {});
  }, [question?._id, launch, launchId]);

  // Poll captains' submitted answers every 3s while checking.
  useEffect(() => {
    if (!launchId) return;
    let cancelled = false;

    const fetchAnswers = () => {
      api.get(`/launches/${launchId}/answers`)
        .then(({ data }) => { if (!cancelled) setCaptainAnswers(data); })
        .catch(() => {});
    };

    fetchAnswers();
    const interval = setInterval(fetchAnswers, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [launchId]);

  const captainAnswerEntries = useMemo(() => {
    if (!launchId) return MOCK_CAPTAIN_TEAMS.map(t => ({ ...t, answer: 'Вариант ответа' }));
    if (!round || !question) return [];
    return teams.map((t: any) => {
      const teamAnswer = captainAnswers.find((a: any) => String(a.teamId?._id || a.teamId) === String(t.teamId));
      const entry = teamAnswer?.answers?.find((a: any) => a.roundId === round._id && a.questionId === question._id);
      return { id: t.teamId, title: t.teamTitle, answer: entry?.answerText || null };
    });
  }, [launchId, round, question, teams, captainAnswers]);

  // Reset matches when moving to a new question.
  useEffect(() => {
    setAssignedAnswers({});
  }, [question?._id]);

  // Auto-match: exact (case/whitespace-insensitive) text match to an official answer.
  useEffect(() => {
    if (!launchId || !question?.answers?.length) return;
    setAssignedAnswers(prev => {
      let changed = false;
      const next = { ...prev };
      captainAnswerEntries.forEach((entry: any) => {
        if (!entry.answer || prev[entry.id]) return;
        const normalized = entry.answer.trim().toLowerCase();
        const match = question.answers.find((a: any) => (a.text || '').trim().toLowerCase() === normalized);
        if (match?._id) {
          next[entry.id] = match._id;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [captainAnswerEntries, question, launchId]);

  if (!game) return <div className={`${styles.fullscreen} ${themeClass}`} style={{ color: 'white' }}>Loading...</div>;
  if (!round || !round.questions || round.questions.length === 0) {
    return <div className={`${styles.fullscreen} ${themeClass}`} style={{ color: 'white' }}>No questions.</div>;
  }

  const isLastQuestion = qIndex >= round.questions.length - 1;
  const hasImage = !!question.imageUrl;

  const assignAnswer = (teamId: string, answerId: string | null) => {
    setIsSaved(false);
    setAssignedAnswers(prev => {
      const next = { ...prev };
      if (answerId) next[teamId] = answerId;
      else delete next[teamId];
      return next;
    });
    setOpenCaptainPopover(null);
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setQIndex(qIndex + 1);
      setRevealed({});
      setOpenCaptainPopover(null);
      setIsSaved(false);
    } else {
      const backPath = launchId ? `/launch/${launchId}/rounds` : `/game/${id}/rounds`;
      navigate(backPath);
    }
  };

  const toggleAnswer = (idx: number) => {
    if (!hasPermission('EDIT')) return;
    setRevealed(prev => {
      const next = !prev[idx];
      if (next) playRevealSound();
      return { ...prev, [idx]: next };
    });
  };

  const handleCalculateAndSave = async () => {
    if (!launchId || !launch) {
      toast.error('No launch session active');
      return;
    }

    // Sum up points per team based on the matched official answer.
    const pointsDelta: Record<string, number> = {};
    Object.entries(assignedAnswers).forEach(([teamId, answerId]) => {
      const answer = question.answers?.find((a: any) => a._id === answerId);
      if (answer) pointsDelta[teamId] = (pointsDelta[teamId] || 0) + (answer.points || 0);
    });

    const updatedTeamGameInfo = launch.teamGameInfo.map((t: any) => ({
      ...t,
      teamPoints: t.teamPoints + (pointsDelta[t.teamId] || 0)
    }));

    try {
      await api.put(`/launches/${launchId}`, { ...launch, teamGameInfo: updatedTeamGameInfo });
      setLaunch((prev: any) => ({ ...prev, teamGameInfo: updatedTeamGameInfo }));
      toast.success('Points saved!');
      setIsSaved(true);
    } catch {
      toast.error('Failed to save points');
    }
  };

  const backPath = launchId ? `/launch/${launchId}/rounds` : `/game/${id}/rounds`;
  const canEdit = !!launch && hasPermission('EDIT');

  const board = (
    <div className={styles.board}>
      {question.answers?.map((answer: any, idx: number) => (
        <div key={answer._id || idx} className={styles.answerWrapper}>
          <div className={styles.answerPlank} onClick={() => toggleAnswer(idx)}>
            <div className={styles.leftSide}>
              <span className={styles.number}>{idx + 1}</span>
              <span className={styles.text}>
                {revealed[idx] ? answer.text : '•••••••••••••'}
              </span>
            </div>
            <div className={styles.rightSide}>
              <span className={styles.pointsCombo}>
                {revealed[idx] ? `${answer.points} / ${answer.popularity || 0}%` : '? / ?%'}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const controls = (
    <div className={styles.controls}>
      {hasPermission('EDIT') && (
        <button onClick={handleNext} className={`${styles.btn} ${styles.next}`}>
          {isLastQuestion ? 'End Round' : 'Next Question'}
        </button>
      )}
      <Link to={backPath} className={`${styles.btn} ${styles.back}`}>
        Back to Rounds
      </Link>
    </div>
  );

  return (
    <div className={`${styles.fullscreen} ${themeClass}`} onClick={() => setOpenCaptainPopover(null)}>
      <div className={styles.audioControls} onClick={e => e.stopPropagation()}>
        <FinishGameButton launchId={launchId} />
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

      {!hasImage ? (
        <div className={styles.centeredLayout}>
          <div className={styles.progress}>
            Question {qIndex + 1} / {round.questions.length}
          </div>
          <h2 className={styles.questionTitle}>{question.title}</h2>

          {board}

          {launch && hasPermission('EDIT') && (
            <button
              onClick={handleCalculateAndSave}
              className={`${styles.btn} ${styles.calcBtn} ${isSaved ? styles.saved : ''}`}
              disabled={isSaved}
            >
              {isSaved ? '✓ Saved' : 'Calculate & Save'}
            </button>
          )}

          {controls}
        </div>
      ) : (
        <div className={styles.threeColLayout}>
          <div className={styles.captainsCol}>
            <h3 className={styles.colTitle}>Ответы капитанов</h3>
            <div className={styles.captainList}>
              {captainAnswerEntries.map((entry: any) => {
                const matchedAnswer = question.answers?.find((a: any) => a._id === assignedAnswers[entry.id]);
                return (
                  <div key={entry.id} className={styles.captainCard}>
                    <div className={styles.captainCardHeader}>
                      <span className={styles.captainTeam}>{entry.title}</span>
                      {canEdit && (
                        <div
                          className={styles.matchPopoverWrap}
                          ref={openCaptainPopover === entry.id ? popoverRef : null}
                        >
                          <button
                            type="button"
                            className={styles.matchTriggerBtn}
                            disabled={!entry.answer}
                            onClick={e => {
                              e.stopPropagation();
                              setOpenCaptainPopover(openCaptainPopover === entry.id ? null : entry.id);
                            }}
                          >
                            {matchedAnswer ? 'Изменить' : 'Сопоставить'}
                          </button>
                          {openCaptainPopover === entry.id && (
                            <div className={styles.matchPopover} onClick={e => e.stopPropagation()}>
                              <label className={styles.matchOption}>
                                <input
                                  type="radio"
                                  name={`match-${entry.id}`}
                                  checked={!assignedAnswers[entry.id]}
                                  onChange={() => assignAnswer(entry.id, null)}
                                />
                                <span>— Не выбрано —</span>
                              </label>
                              {question.answers?.map((a: any, aIdx: number) => (
                                <label key={a._id || aIdx} className={styles.matchOption}>
                                  <input
                                    type="radio"
                                    name={`match-${entry.id}`}
                                    checked={assignedAnswers[entry.id] === a._id}
                                    onChange={() => assignAnswer(entry.id, a._id)}
                                  />
                                  <span>{a.text} <em>({a.points} pts)</em></span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <span className={`${styles.captainAnswer} ${!entry.answer ? styles.captainPending : ''}`}>
                      {entry.answer ? `«${entry.answer}»` : 'Ожидание ответа…'}
                    </span>

                    {matchedAnswer && (
                      <div className={styles.matchedBadge}>
                        ✓ {matchedAnswer.text} · {matchedAnswer.points} pts
                      </div>
                    )}
                  </div>
                );
              })}
              {captainAnswerEntries.length === 0 && (
                <p className={styles.captainEmpty}>Нет подключенных капитанов.</p>
              )}
            </div>
          </div>

          <div className={styles.boardCol}>
            <h3 className={styles.colTitle}>Табло ответов</h3>
            <div className={styles.progress}>
              Question {qIndex + 1} / {round.questions.length}
            </div>
            {board}
          </div>

          <div className={styles.questionCol}>
            <h3 className={styles.colTitle}>Вопрос</h3>
            <h2 className={styles.questionTitle}>{question.title}</h2>
            <img src={optimizeCloudinaryUrl(question.imageUrl)} alt="" className={styles.questionImage} />

            {launch && hasPermission('EDIT') && (
              <button
                onClick={handleCalculateAndSave}
                className={`${styles.btn} ${styles.calcBtn} ${isSaved ? styles.saved : ''}`}
                disabled={isSaved}
              >
                {isSaved ? '✓ Saved' : 'Calculate & Save'}
              </button>
            )}

            {controls}
          </div>
        </div>
      )}
    </div>
  );
}

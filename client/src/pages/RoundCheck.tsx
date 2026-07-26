import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import styles from './RoundCheck.module.scss';
import { optimizeCloudinaryUrl } from '../utils/image';

export default function RoundCheck() {
  const { id, roundId, launchId } = useParams();
  const navigate = useNavigate();
  const [game, setGame] = useState<any>(null);
  const [launch, setLaunch] = useState<any>(null);
  const [qIndex, setQIndex] = useState(0);
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  // answerTeams: { [answerIdx]: Set<teamId> }
  const [answerTeams, setAnswerTeams] = useState<Record<number, Set<string>>>({});
  const [openPopover, setOpenPopover] = useState<number | null>(null);
  const [isSaved, setIsSaved] = useState(false);
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
        setOpenPopover(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!game) return <div style={{ padding: '2rem', color: 'white' }}>Loading...</div>;

  const round = game.rounds?.find((r: any, idx: number) => r._id === roundId || idx.toString() === roundId);
  if (!round || !round.questions || round.questions.length === 0) return <div style={{ padding: '2rem', color: 'white' }}>No questions.</div>;

  const question = round.questions[qIndex];
  const isLastQuestion = qIndex >= round.questions.length - 1;
  const teams: any[] = launch?.teamGameInfo || [];

  const handleNext = () => {
    if (!isLastQuestion) {
      setQIndex(qIndex + 1);
      setRevealed({});
      setAnswerTeams({});
      setOpenPopover(null);
      setIsSaved(false);
    } else {
      const backPath = launchId ? `/launch/${launchId}/rounds` : `/game/${id}/rounds`;
      navigate(backPath);
    }
  };

  const toggleAnswer = (idx: number) => {
    setRevealed(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleTeamForAnswer = (answerIdx: number, teamId: string) => {
    setIsSaved(false);
    setAnswerTeams(prev => {
      const current = new Set(prev[answerIdx] || []);
      if (current.has(teamId)) {
        current.delete(teamId);
      } else {
        current.add(teamId);
      }
      return { ...prev, [answerIdx]: current };
    });
  };

  const selectAll = (answerIdx: number) => {
    setIsSaved(false);
    setAnswerTeams(prev => ({
      ...prev,
      [answerIdx]: new Set(teams.map((t: any) => t.teamId))
    }));
  };

  const clearAll = (answerIdx: number) => {
    setIsSaved(false);
    setAnswerTeams(prev => ({ ...prev, [answerIdx]: new Set() }));
  };

  const getTeamTitle = (teamId: string) => {
    return teams.find((t: any) => t.teamId === teamId)?.teamTitle || teamId;
  };

  const handleCalculateAndSave = async () => {
    if (!launchId || !launch) {
      toast.error('No launch session active');
      return;
    }

    // Sum up points per team
    const pointsDelta: Record<string, number> = {};
    question.answers?.forEach((answer: any, aIdx: number) => {
      const teamsForAnswer = answerTeams[aIdx] || new Set();
      teamsForAnswer.forEach((teamId: string) => {
        pointsDelta[teamId] = (pointsDelta[teamId] || 0) + (answer.points || 0);
      });
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

  return (
    <div className={styles.fullscreen} onClick={() => setOpenPopover(null)}>
      <div className={styles.progress}>
        Question {qIndex + 1} / {round.questions.length}
      </div>
      <h2 className={styles.questionTitle}>{question.title}</h2>

      {question.imageUrl && (
        <img src={optimizeCloudinaryUrl(question.imageUrl)} alt="" className={styles.questionImage} />
      )}

      <div className={styles.board}>
        {question.answers?.map((answer: any, idx: number) => {
          const selectedTeams = answerTeams[idx] || new Set();
          const selectedTitles = [...selectedTeams].map(getTeamTitle);

          return (
            <div key={idx} className={styles.answerWrapper}>
              <div className={styles.answerPlank} onClick={() => toggleAnswer(idx)}>
                <div className={styles.leftSide}>
                  <span className={styles.number}>{idx + 1}</span>
                  <span className={styles.text}>
                    {revealed[idx] ? answer.text : '•••••••••••••'}
                  </span>
                </div>
                <div className={styles.rightSide}>
                  <span className={styles.points}>
                    {revealed[idx] ? answer.points : '?'}
                  </span>
                  {launch && (
                    <div className={styles.popoverWrap} ref={openPopover === idx ? popoverRef : null}>
                      <button
                        className={`${styles.addTeamBtn} ${selectedTeams.size > 0 ? styles.active : ''}`}
                        onClick={e => { e.stopPropagation(); setOpenPopover(openPopover === idx ? null : idx); }}
                      >
                        {selectedTeams.size > 0 ? `+${selectedTeams.size}` : '+'}
                      </button>
                      {openPopover === idx && (
                        <div className={styles.popover} onClick={e => e.stopPropagation()}>
                          <div className={styles.popoverActions}>
                            <button onClick={() => selectAll(idx)}>Select All</button>
                            <button onClick={() => clearAll(idx)}>Clear</button>
                          </div>
                          <div className={styles.teamList}>
                            {teams.map((team: any) => (
                              <label key={team.teamId} className={styles.teamRow}>
                                <input
                                  type="checkbox"
                                  checked={selectedTeams.has(team.teamId)}
                                  onChange={() => toggleTeamForAnswer(idx, team.teamId)}
                                />
                                <span>{team.teamTitle}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              {selectedTitles.length > 0 && (
                <div className={styles.teamTags}>
                  {selectedTitles.map(t => <span key={t} className={styles.tag}>{t}</span>)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {launch && (
        <button
          onClick={handleCalculateAndSave}
          className={`${styles.btn} ${styles.calcBtn} ${isSaved ? styles.saved : ''}`}
          disabled={isSaved}
        >
          {isSaved ? '✓ Saved' : 'Calculate & Save'}
        </button>
      )}

      <div className={styles.controls}>
        <button onClick={handleNext} className={`${styles.btn} ${styles.next}`}>
          {isLastQuestion ? 'End Round' : 'Next Question'}
        </button>
        <Link to={launchId ? `/launch/${launchId}/rounds` : `/game/${id}/rounds`} className={`${styles.btn} ${styles.back}`}>
          Back to Rounds
        </Link>
      </div>
    </div>
  );
}

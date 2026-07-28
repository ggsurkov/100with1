import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { GameTypes } from '../types/game';
import ConfirmModal from '../components/ConfirmModal';
import common from './pagesStyles.module.scss';
import styles from './GameEdit.module.scss';
import { optimizeCloudinaryUrl } from '../utils/image';

export default function GameEdit() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<GameTypes>(GameTypes.GuessPopularity);
  const [rounds, setRounds] = useState<any[]>([]);
  const [loading, setLoading] = useState(!isNew);

  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) {
      setTitle('');
      setDescription('');
      setType(GameTypes.GuessPopularity);
      setRounds([]);
      setSelectedRoundIndex(null);
      setSelectedQuestionIndex(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    api.get(`/games/${id}`).then(({ data }) => {
      setTitle(data.title);
      setDescription(data.description || '');
      setType(data.type || GameTypes.GuessPopularity);
      const loadedRounds = data.rounds || [];
      setRounds(loadedRounds);
      setSelectedRoundIndex(loadedRounds.length > 0 ? 0 : null);
      setSelectedQuestionIndex(null);
    }).catch(() => {
      toast.error('Failed to load game');
    }).finally(() => setLoading(false));
  }, [id, isNew]);

  useEffect(() => {
    if (!previewImageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImageUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImageUrl]);

  const addRound = () => {
    const newRounds = [...rounds, { orderNumber: rounds.length + 1, hint: '', questions: [] }];
    setRounds(newRounds);
    setSelectedRoundIndex(newRounds.length - 1);
    setSelectedQuestionIndex(null);
  };

  const selectRound = (idx: number) => {
    setSelectedRoundIndex(idx);
    setSelectedQuestionIndex(null);
  };

  const updateRound = (rIndex: number, field: string, value: any) => {
    const newRounds = [...rounds];
    newRounds[rIndex][field] = value;
    setRounds(newRounds);
  };

  const addQuestion = (rIndex: number) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions.push({
      title: '',
      timer: 60,
      orderNumber: newRounds[rIndex].questions.length + 1,
      answers: [],
    });
    setRounds(newRounds);
    setSelectedQuestionIndex(newRounds[rIndex].questions.length - 1);
  };

  const selectQuestion = (idx: number) => setSelectedQuestionIndex(idx);

  const updateQuestion = (rIndex: number, qIndex: number, field: string, value: any) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions[qIndex][field] = value;
    setRounds(newRounds);
  };

  const addAnswer = (rIndex: number, qIndex: number) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions[qIndex].answers.push({
      text: '',
      hint: '',
      points: 0,
      orderNumber: newRounds[rIndex].questions[qIndex].answers.length + 1,
      hide: true,
      popularity: 0,
    });
    setRounds(newRounds);
  };

  const updateAnswer = (rIndex: number, qIndex: number, aIndex: number, field: string, value: any) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions[qIndex].answers[aIndex][field] = value;
    setRounds(newRounds);
  };

  const handleImageUpload = async (rIndex: number, qIndex: number, file: File) => {
    const key = `${rIndex}-${qIndex}`;
    setUploadingKey(key);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      updateQuestion(rIndex, qIndex, 'imageUrl', data.imageUrl);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось загрузить картинку');
    } finally {
      setUploadingKey(null);
    }
  };

  const validate = (): boolean => {
    if (!title.trim()) {
      toast.error('Ошибка: Название игры не может быть пустым');
      return false;
    }
    for (let rIndex = 0; rIndex < rounds.length; rIndex++) {
      const round = rounds[rIndex];
      if (!round.questions || round.questions.length === 0) {
        toast.error(`Ошибка: В раунде ${rIndex + 1} нет ни одного вопроса`);
        return false;
      }
      for (let qIndex = 0; qIndex < round.questions.length; qIndex++) {
        const question = round.questions[qIndex];
        if (!question.title || question.title.trim() === '') {
          toast.error(`Ошибка: В раунде ${rIndex + 1}, вопросе ${qIndex + 1} пустое название`);
          return false;
        }
        if (!question.answers || question.answers.length === 0) {
          toast.error(`Ошибка: Вопрос "${question.title}" не содержит ни одного ответа`);
          return false;
        }
        for (let aIndex = 0; aIndex < question.answers.length; aIndex++) {
          const answer = question.answers[aIndex];
          if (!answer.text || answer.text.trim() === '') {
            toast.error(`Ошибка: В вопросе "${question.title}", ответе ${aIndex + 1} пустой текст`);
            return false;
          }
        }
      }
    }
    return true;
  };

  const handleSave = async () => {
    if (!validate()) return;
    const payload = { title, description, type, rounds };
    try {
      if (isNew) {
        const { data } = await api.post('/games', payload);
        toast.success('Игра успешно создана!');
        navigate(`/admin/games/${data._id}`);
      } else {
        const { data } = await api.put(`/games/${id}`, payload);
        setRounds(data.rounds || []);
        toast.success('Игра успешно обновлена!');
      }
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Ошибка при сохранении игры на сервере');
      }
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/games/${id}`);
      toast.success('Игра удалена');
      navigate('/admin/games');
    } catch {
      toast.error('Не удалось удалить игру');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const canSave = isNew ? hasPermission('CREATE') : hasPermission('EDIT');
  const selectedRound = selectedRoundIndex !== null ? rounds[selectedRoundIndex] : null;
  const selectedQuestion =
    selectedRound && selectedQuestionIndex !== null ? selectedRound.questions[selectedQuestionIndex] : null;

  return (
    <div className={common.card}>
      <h2 className={common.title}>{isNew ? 'Создание игры' : 'Редактирование игры'}</h2>

      <div className={styles.page}>
        <div className={styles.header}>
          <input
            className={styles.titleInput}
            placeholder="Название игры"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <input
            className={styles.descInput}
            placeholder="Описание"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <select
            className={styles.typeSelect}
            value={type}
            onChange={e => setType(e.target.value as GameTypes)}
          >
            <option value={GameTypes.GuessPopularity}>Угадай популярность</option>
          </select>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : (
          <div className={styles.columns}>
            {/* Column 1: Rounds */}
            <div className={styles.column}>
              <div className={styles.columnHeader}>
                <h3>Раунды</h3>
                <button type="button" className={styles.addBtn} onClick={addRound}>
                  + Добавить раунд
                </button>
              </div>
              <div className={styles.list}>
                {rounds.length === 0 && <p className={styles.emptyHint}>Нет раундов</p>}
                {rounds.map((round, rIndex) => (
                  <div
                    key={rIndex}
                    className={`${styles.card} ${selectedRoundIndex === rIndex ? styles.cardActive : ''}`}
                    onClick={() => selectRound(rIndex)}
                  >
                    <div className={styles.cardTitle}>Раунд {round.orderNumber || rIndex + 1}</div>
                    <input
                      className={styles.cardInput}
                      placeholder="Подсказка раунда"
                      value={round.hint}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updateRound(rIndex, 'hint', e.target.value)}
                    />
                    <div className={styles.cardMeta}>{round.questions?.length || 0} вопрос(ов)</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Questions */}
            <div className={styles.column}>
              <div className={styles.columnHeader}>
                <h3>Вопросы</h3>
                {selectedRoundIndex !== null && (
                  <button type="button" className={styles.addBtn} onClick={() => addQuestion(selectedRoundIndex)}>
                    + Добавить вопрос
                  </button>
                )}
              </div>
              {selectedRoundIndex === null || !selectedRound ? (
                <p className={styles.placeholder}>Выберите раунд</p>
              ) : (
                <div className={styles.list}>
                  {(selectedRound.questions || []).length === 0 && (
                    <p className={styles.emptyHint}>Нет вопросов</p>
                  )}
                  {selectedRound.questions?.map((q: any, qIndex: number) => {
                    const key = `${selectedRoundIndex}-${qIndex}`;
                    return (
                      <div
                        key={qIndex}
                        className={`${styles.card} ${selectedQuestionIndex === qIndex ? styles.cardActive : ''}`}
                        onClick={() => selectQuestion(qIndex)}
                      >
                        <div className={styles.cardTitle}>Вопрос {q.orderNumber || qIndex + 1}</div>
                        <input
                          className={styles.cardInput}
                          placeholder="Текст вопроса"
                          value={q.title}
                          onClick={e => e.stopPropagation()}
                          onChange={e => updateQuestion(selectedRoundIndex, qIndex, 'title', e.target.value)}
                        />
                        <div className={styles.cardRow} onClick={e => e.stopPropagation()}>
                          <input
                            className={styles.timerInput}
                            type="number"
                            placeholder="Таймер"
                            value={q.timer}
                            onChange={e =>
                              updateQuestion(selectedRoundIndex, qIndex, 'timer', parseInt(e.target.value))
                            }
                          />
                          {hasPermission('CREATE') && (
                            <label className={styles.uploadBtn}>
                              {uploadingKey === key ? '...' : '📷'}
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                disabled={uploadingKey === key}
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(selectedRoundIndex, qIndex, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                          {q.imageUrl && (
                            <img
                              src={optimizeCloudinaryUrl(q.imageUrl)}
                              alt=""
                              className={styles.thumb}
                              onClick={ev => {
                                ev.stopPropagation();
                                setPreviewImageUrl(q.imageUrl);
                              }}
                            />
                          )}
                        </div>
                        <div className={styles.cardMeta}>{q.answers?.length || 0} ответ(ов)</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Column 3: Answers */}
            <div className={styles.column}>
              <div className={styles.columnHeader}>
                <h3>Ответы</h3>
                {selectedRoundIndex !== null && selectedQuestionIndex !== null && (
                  <button
                    type="button"
                    className={styles.addBtn}
                    onClick={() => addAnswer(selectedRoundIndex, selectedQuestionIndex)}
                  >
                    + Добавить ответ
                  </button>
                )}
              </div>
              {selectedRoundIndex === null || selectedQuestionIndex === null || !selectedQuestion ? (
                <p className={styles.placeholder}>Выберите вопрос для просмотра и редактирования ответов</p>
              ) : (
                <div className={styles.list}>
                  {(selectedQuestion.answers || []).length === 0 && (
                    <p className={styles.emptyHint}>Нет ответов</p>
                  )}
                  {selectedQuestion.answers?.map((a: any, aIndex: number) => (
                    <div key={aIndex} className={styles.answerCard}>
                      <div className={styles.answerRowTop}>
                        <span className={styles.answerNumber}>{a.orderNumber || aIndex + 1}</span>
                        <input
                          className={styles.answerText}
                          placeholder="Текст ответа"
                          value={a.text}
                          onChange={e =>
                            updateAnswer(selectedRoundIndex, selectedQuestionIndex, aIndex, 'text', e.target.value)
                          }
                        />
                      </div>
                      <input
                        className={styles.answerHint}
                        placeholder="Подсказка"
                        value={a.hint || ''}
                        onChange={e =>
                          updateAnswer(selectedRoundIndex, selectedQuestionIndex, aIndex, 'hint', e.target.value)
                        }
                      />
                      <div className={styles.answerRowBottom}>
                        <label className={styles.answerFieldLabel}>
                          Баллы
                          <input
                            className={styles.answerNumberInput}
                            type="number"
                            value={a.points}
                            onChange={e =>
                              updateAnswer(
                                selectedRoundIndex,
                                selectedQuestionIndex,
                                aIndex,
                                'points',
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </label>
                        <label className={styles.answerFieldLabel}>
                          Популярность %
                          <input
                            className={styles.answerNumberInput}
                            type="number"
                            min={0}
                            max={100}
                            value={a.popularity ?? 0}
                            onChange={e =>
                              updateAnswer(
                                selectedRoundIndex,
                                selectedQuestionIndex,
                                aIndex,
                                'popularity',
                                parseInt(e.target.value)
                              )
                            }
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={() => navigate('/admin/games')}>
            Отмена
          </button>
          <div className={styles.footerSpacer} />
          {!isNew && hasPermission('CREATE') && (
            <button type="button" className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
              Удалить игру
            </button>
          )}
          {canSave && (
            <button type="button" className={styles.saveBtn} onClick={handleSave}>
              Сохранить
            </button>
          )}
        </div>
      </div>

      {previewImageUrl && (
        <div className={styles.lightboxOverlay} onClick={() => setPreviewImageUrl(null)}>
          <button type="button" className={styles.lightboxClose} onClick={() => setPreviewImageUrl(null)}>
            ✕
          </button>
          <img
            src={optimizeCloudinaryUrl(previewImageUrl || undefined)}
            alt="Preview"
            className={styles.lightboxImage}
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}

      {showDeleteConfirm && (
        <ConfirmModal
          title="Удалить игру"
          message="Вы уверены, что хотите удалить игру? Это действие необратимо."
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

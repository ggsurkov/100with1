import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import common from './pagesStyles.module.scss';
import styles from './GamesAdmin.module.scss'; // keeping unique specific styles
import { optimizeCloudinaryUrl } from '../utils/image';

export default function GameEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rounds, setRounds] = useState<any[]>([]);

  useEffect(() => {
    api.get(`/games/${id}`).then(({ data }) => {
      setTitle(data.title);
      setDescription(data.description);
      setRounds(data.rounds || []);
    }).catch(() => {
      toast.error('Failed to load game');
    });
  }, [id]);

  const addRound = () => setRounds([...rounds, { orderNumber: rounds.length + 1, hint: '', questions: [] }]);
  const addQuestion = (rIndex: number) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions.push({ title: '', timer: 60, orderNumber: newRounds[rIndex].questions.length + 1, answers: [] });
    setRounds(newRounds);
  };
  const addAnswer = (rIndex: number, qIndex: number) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions[qIndex].answers.push({ text: '', points: 0, orderNumber: newRounds[rIndex].questions[qIndex].answers.length + 1, hide: true, popularity: 0 });
    setRounds(newRounds);
  };
  const updateRound = (rIndex: number, field: string, value: any) => {
    const newRounds = [...rounds];
    newRounds[rIndex][field] = value;
    setRounds(newRounds);
  };
  const updateQuestion = (rIndex: number, qIndex: number, field: string, value: any) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions[qIndex][field] = value;
    setRounds(newRounds);
  };
  const updateAnswer = (rIndex: number, qIndex: number, aIndex: number, field: string, value: any) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions[qIndex].answers[aIndex][field] = value;
    setRounds(newRounds);
  };

  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!previewImageUrl) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPreviewImageUrl(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImageUrl]);

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

  const handleUpdate = async () => {
    if (!title.trim()) {
      toast.error('Ошибка: Название игры не может быть пустым');
      return;
    }

    for (let rIndex = 0; rIndex < rounds.length; rIndex++) {
      const round = rounds[rIndex];
      if (!round.questions || round.questions.length === 0) {
        toast.error(`Ошибка: В раунде ${rIndex + 1} нет ни одного вопроса`);
        return;
      }

      for (let qIndex = 0; qIndex < round.questions.length; qIndex++) {
        const question = round.questions[qIndex];
        if (!question.title || question.title.trim() === '') {
          toast.error(`Ошибка: В раунде ${rIndex + 1}, вопросе ${qIndex + 1} пустое название`);
          return;
        }

        if (!question.answers || question.answers.length === 0) {
          toast.error(`Ошибка: Вопрос "${question.title}" не содержит ни одного ответа`);
          return;
        }

        for (let aIndex = 0; aIndex < question.answers.length; aIndex++) {
          const answer = question.answers[aIndex];
          if (!answer.text || answer.text.trim() === '') {
            toast.error(`Ошибка: В вопросе "${question.title}", ответе ${aIndex + 1} пустой текст`);
            return;
          }
        }
      }
    }

    try {
      await api.put(`/games/${id}`, { title, description, rounds });
      toast.success('Игра успешно обновлена!');
      navigate('/admin/games');
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Ошибка при обновлении игры на сервере');
      }
    }
  };

  return (
    <div className={common.card}>
      <h2 className={common.title}>Edit Game</h2>
      <div className={styles.formSection}>
        <div className={common.row}>
          <input className={common.input} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className={common.input} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>

        {rounds.map((round, rIndex) => (
          <div key={rIndex} className={styles.roundBox}>
            <h4>Round {round.orderNumber || rIndex + 1}</h4>
            <input className={common.input} style={{ marginBottom: '1rem', width: '100%' }} placeholder="Round Hint" value={round.hint} onChange={e => updateRound(rIndex, 'hint', e.target.value)} />

            {round.questions?.map((q: any, qIndex: number) => (
              <div key={qIndex} className={styles.questionBox}>
                <h5>Question {q.orderNumber || qIndex + 1}</h5>
                <div className={common.row}>
                  <input className={common.input} placeholder="Question Title" value={q.title} onChange={e => updateQuestion(rIndex, qIndex, 'title', e.target.value)} />
                  <input className={common.input} style={{ flex: '0 0 100px' }} type="number" placeholder="Timer" value={q.timer} onChange={e => updateQuestion(rIndex, qIndex, 'timer', parseInt(e.target.value))} />
                </div>

                <div className={styles.imageSection}>
                  <input className={common.input} placeholder="Image URL (optional)" value={q.imageUrl || ''} onChange={e => updateQuestion(rIndex, qIndex, 'imageUrl', e.target.value || undefined)} />
                  <label className={styles.uploadBtn}>
                    {uploadingKey === `${rIndex}-${qIndex}` ? 'Uploading...' : 'Upload Image'}
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      disabled={uploadingKey === `${rIndex}-${qIndex}`}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(rIndex, qIndex, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {q.imageUrl && (
                    <div className={styles.imagePreviewWrap}>
                      <img
                        src={optimizeCloudinaryUrl(q.imageUrl)}
                        alt="Question"
                        className={styles.imagePreview}
                        onClick={() => setPreviewImageUrl(q.imageUrl)}
                      />
                      <button
                        type="button"
                        className={styles.removeImageBtn}
                        onClick={() => updateQuestion(rIndex, qIndex, 'imageUrl', undefined)}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>

                {q.answers?.map((a: any, aIndex: number) => (
                  <div key={aIndex} className={styles.answerRow}>
                    <input className={common.input} placeholder={`Answer ${a.orderNumber || aIndex + 1}`} value={a.text} onChange={e => updateAnswer(rIndex, qIndex, aIndex, 'text', e.target.value)} />
                    <input className={common.input} style={{ flex: '0 0 80px' }} type="number" placeholder="Pts" value={a.points} onChange={e => updateAnswer(rIndex, qIndex, aIndex, 'points', parseInt(e.target.value))} />
                    <input className={common.input} style={{ flex: '0 0 90px' }} type="number" min="0" max="100" placeholder="Pop. %" value={a.popularity ?? 0} onChange={e => updateAnswer(rIndex, qIndex, aIndex, 'popularity', parseInt(e.target.value))} />
                  </div>
                ))}
                <button onClick={() => addAnswer(rIndex, qIndex)} className={`${styles.btnAction} ${styles.addA}`}>+ Add Answer</button>
              </div>
            ))}
            <button onClick={() => addQuestion(rIndex)} className={`${styles.btnAction} ${styles.addQ}`}>+ Add Question</button>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button onClick={addRound} className={`${styles.btnAction} ${styles.addR}`} style={{ marginTop: 0 }}>+ Add Round</button>
          <div style={{ flex: 1 }}></div>
          <button onClick={() => navigate('/admin/games')} className={styles.saveBtn} style={{ background: 'rgba(255,255,255,0.1)', marginTop: 0 }}>Cancel</button>
          <button onClick={handleUpdate} className={styles.saveBtn} style={{ marginTop: 0 }}>Save Changes</button>
        </div>
      </div>

      {previewImageUrl && (
        <div className={styles.lightboxOverlay} onClick={() => setPreviewImageUrl(null)}>
          <button
            type="button"
            className={styles.lightboxClose}
            onClick={() => setPreviewImageUrl(null)}
          >
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
    </div>
  );
}

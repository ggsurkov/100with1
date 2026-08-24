import React, { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DEFAULT_GAME_SPEC,
  GameRoundSpec,
  GenerateGamePayload,
  MECHANIC_OPTIONS,
  MechanicOption,
  RATING_OPTIONS,
  RatingOption,
  ROUND_TYPE_OPTIONS,
  RoundTypeOption,
  THEME_OPTIONS,
  ThemeOption,
} from '../types/generation';
import styles from './GenerateGameModal.module.scss';

interface GenerateGameModalProps {
  onClose: () => void;
}

function toggleIn<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(item => item !== value) : [...list, value];
}

// roundNumber всегда равен позиции раунда в списке — пересчитываем после
// добавления и удаления, чтобы в payload не было дыр в нумерации.
function renumber(spec: GameRoundSpec[]): GameRoundSpec[] {
  return spec.map((round, index) => ({ ...round, roundNumber: index + 1 }));
}

export default function GenerateGameModal({ onClose }: GenerateGameModalProps) {
  const { user } = useAuth();

  const [gameTitle, setGameTitle] = useState('');
  const [gameDescription, setGameDescription] = useState('');
  const [userLogin, setUserLogin] = useState(user?.email || 'new_user');
  const [isApllyUsedQuestion, setIsApllyUsedQuestion] = useState(false);
  const [themes, setThemes] = useState<ThemeOption[]>([]);
  const [mechanics, setMechanics] = useState<MechanicOption[]>([]);
  const [ratings, setRatings] = useState<RatingOption[]>([]);
  const [gameSpec, setGameSpec] = useState<GameRoundSpec[]>(DEFAULT_GAME_SPEC);
  const [submitting, setSubmitting] = useState(false);

  const updateRound = (index: number, field: 'questionCount' | 'roundType', value: number | RoundTypeOption) => {
    setGameSpec(prev => prev.map((round, i) => (i === index ? { ...round, [field]: value } : round)));
  };

  const addRound = () => {
    setGameSpec(prev => renumber([...prev, { roundNumber: prev.length + 1, questionCount: 5, roundType: 'simple' }]));
  };

  const removeRound = (index: number) => {
    setGameSpec(prev => renumber(prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = async () => {
    const payload: GenerateGamePayload = {
      userLogin,
      gameTitle,
      gameDescription,
      isApllyUsedQuestion,
      themes,
      mechanics,
      ratings,
      gameSpec,
    };

    setSubmitting(true);
    try {
      await api.post('/games/generate', payload);
      toast.success('Спецификация отправлена на генерацию');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось отправить спецификацию');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!gameTitle.trim() && gameSpec.length > 0 && !submitting;

  return (
    <div className={styles.overlay} onClick={() => !submitting && onClose()}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <h2 className={styles.title}>Сгенерировать игру</h2>

        <div className={styles.body}>
          <label className={styles.field}>
            <span className={styles.label}>Название игры</span>
            <input
              className={styles.input}
              value={gameTitle}
              onChange={e => setGameTitle(e.target.value)}
              placeholder="Например: Осенний квиз"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Описание игры</span>
            <textarea
              className={styles.textarea}
              value={gameDescription}
              onChange={e => setGameDescription(e.target.value)}
              rows={3}
              placeholder="О чём игра, для какой аудитории"
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Логин пользователя</span>
            <input
              className={styles.input}
              value={userLogin}
              onChange={e => setUserLogin(e.target.value)}
            />
          </label>

          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={isApllyUsedQuestion}
              onChange={e => setIsApllyUsedQuestion(e.target.checked)}
            />
            <span>Использовать уже сыгранные вопросы</span>
          </label>

          <div className={styles.field}>
            <span className={styles.label}>Темы</span>
            <div className={styles.chips}>
              {THEME_OPTIONS.map(theme => (
                <button
                  key={theme}
                  type="button"
                  className={`${styles.chip} ${themes.includes(theme) ? styles.chipActive : ''}`}
                  onClick={() => setThemes(prev => toggleIn(prev, theme))}
                >
                  {theme}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Механики</span>
            <div className={styles.chips}>
              {MECHANIC_OPTIONS.map(mechanic => (
                <button
                  key={mechanic}
                  type="button"
                  className={`${styles.chip} ${mechanics.includes(mechanic) ? styles.chipActive : ''}`}
                  onClick={() => setMechanics(prev => toggleIn(prev, mechanic))}
                >
                  {mechanic}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Рейтинг</span>
            <div className={styles.chips}>
              {RATING_OPTIONS.map(rating => (
                <button
                  key={rating}
                  type="button"
                  className={`${styles.chip} ${ratings.includes(rating) ? styles.chipActive : ''}`}
                  onClick={() => setRatings(prev => toggleIn(prev, rating))}
                >
                  {rating}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <div className={styles.roundsHeader}>
              <span className={styles.label}>Структура раундов</span>
              <button type="button" className={styles.addRoundBtn} onClick={addRound}>
                + Добавить раунд
              </button>
            </div>

            <div className={styles.rounds}>
              {gameSpec.map((round, index) => (
                <div key={index} className={styles.roundRow}>
                  <span className={styles.roundNumber}>{round.roundNumber}</span>

                  <label className={styles.roundField}>
                    <span className={styles.roundLabel}>Вопросов</span>
                    <input
                      className={styles.roundInput}
                      type="number"
                      min={1}
                      value={round.questionCount}
                      onChange={e => updateRound(index, 'questionCount', Number(e.target.value))}
                    />
                  </label>

                  <label className={styles.roundField}>
                    <span className={styles.roundLabel}>Тип</span>
                    <select
                      className={styles.roundSelect}
                      value={round.roundType}
                      onChange={e => updateRound(index, 'roundType', e.target.value)}
                    >
                      {ROUND_TYPE_OPTIONS.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    className={styles.removeRoundBtn}
                    onClick={() => removeRound(index)}
                    aria-label={`Удалить раунд ${round.roundNumber}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
              {gameSpec.length === 0 && <p className={styles.empty}>Нет раундов</p>}
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={submitting}>
            Отмена
          </button>
          <button type="button" className={styles.submitBtn} onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Генерация...' : 'Сгенерировать'}
          </button>
        </div>
      </div>
    </div>
  );
}

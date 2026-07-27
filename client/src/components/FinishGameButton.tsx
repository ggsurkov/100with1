import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ConfirmModal from './ConfirmModal';
import styles from './FinishGameButton.module.scss';

interface FinishGameButtonProps {
  launchId?: string;
}

export default function FinishGameButton({ launchId }: FinishGameButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!launchId || !user || (user.role !== 'admin' && user.role !== 'master')) return null;

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await api.put(`/launches/${launchId}`, { status: 'finished' });
      toast.success('Игра завершена');
      navigate('/results');
    } catch {
      toast.error('Не удалось завершить игру');
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={styles.finishBtn}
        onClick={() => setConfirming(true)}
      >
        Завершить игру
      </button>
      {confirming && (
        <ConfirmModal
          title="Завершить игру"
          message="Вы уверены, что хотите завершить игру? Сессия будет переведена в архив, а результаты зафиксированы."
          confirmLabel={submitting ? 'Завершение...' : 'Завершить'}
          cancelLabel="Отмена"
          onConfirm={handleConfirm}
          onCancel={() => !submitting && setConfirming(false)}
        />
      )}
    </>
  );
}

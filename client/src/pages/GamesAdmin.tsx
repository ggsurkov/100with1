import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import common from './pagesStyles.module.scss';
import styles from './GamesAdmin.module.scss';

export default function GamesAdmin() {
  const { hasPermission } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [rounds, setRounds] = useState<any[]>([]);

  const fetchGames = async () => {
    const { data } = await api.get('/games');
    setGames(data);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const addRound = () => setRounds([...rounds, { orderNumber: rounds.length + 1, hint: '', questions: [] }]);
  const addQuestion = (rIndex: number) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions.push({ title: '', timer: 60, orderNumber: newRounds[rIndex].questions.length + 1, answers: [] });
    setRounds(newRounds);
  };
  const addAnswer = (rIndex: number, qIndex: number) => {
    const newRounds = [...rounds];
    newRounds[rIndex].questions[qIndex].answers.push({ text: '', points: 0, orderNumber: newRounds[rIndex].questions[qIndex].answers.length + 1, hide: true });
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

  const handleCreate = async () => {
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
      await api.post('/games', { title, description, rounds });
      toast.success('Игра успешно сохранена!');
      setTitle(''); setDescription(''); setRounds([]); fetchGames();
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Ошибка при сохранении игры на сервере');
      }
    }
  };
  const handleDelete = async (id: string) => {
    await api.delete(`/games/${id}`); fetchGames();
  };

  return (
    <div className={common.card}>
      <h2 className={common.title}>Manage Games</h2>
      <div className={styles.formSection}>
        <h3>Create Game</h3>
        <div className={common.row}>
          <input className={common.input} placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
          <input className={common.input} placeholder="Description" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        
        {rounds.map((round, rIndex) => (
          <div key={rIndex} className={styles.roundBox}>
            <h4>Round {round.orderNumber}</h4>
            <input className={common.input} style={{marginBottom: '1rem', width: '100%'}} placeholder="Round Hint" value={round.hint} onChange={e => updateRound(rIndex, 'hint', e.target.value)} />
            
            {round.questions.map((q: any, qIndex: number) => (
              <div key={qIndex} className={styles.questionBox}>
                <h5>Question {q.orderNumber}</h5>
                <div className={common.row}>
                  <input className={common.input} placeholder="Question Title" value={q.title} onChange={e => updateQuestion(rIndex, qIndex, 'title', e.target.value)} />
                  <input className={common.input} style={{flex: '0 0 100px'}} type="number" placeholder="Timer" value={q.timer} onChange={e => updateQuestion(rIndex, qIndex, 'timer', parseInt(e.target.value))} />
                </div>
                
                {q.answers.map((a: any, aIndex: number) => (
                  <div key={aIndex} className={styles.answerRow}>
                    <input className={common.input} placeholder={`Answer ${a.orderNumber}`} value={a.text} onChange={e => updateAnswer(rIndex, qIndex, aIndex, 'text', e.target.value)} />
                    <input className={common.input} style={{flex: '0 0 80px'}} type="number" placeholder="Pts" value={a.points} onChange={e => updateAnswer(rIndex, qIndex, aIndex, 'points', parseInt(e.target.value))} />
                  </div>
                ))}
                <button onClick={() => addAnswer(rIndex, qIndex)} className={`${styles.btnAction} ${styles.addA}`}>+ Add Answer</button>
              </div>
            ))}
            <button onClick={() => addQuestion(rIndex)} className={`${styles.btnAction} ${styles.addQ}`}>+ Add Question</button>
          </div>
        ))}
        <div style={{display: 'flex', justifyContent: 'space-between'}}>
          <button onClick={addRound} className={`${styles.btnAction} ${styles.addR}`}>+ Add Round</button>
          {hasPermission('CREATE') && (
            <button onClick={handleCreate} className={styles.saveBtn}>Save Game</button>
          )}
        </div>
      </div>

      <table className={common.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Rounds</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {games.map(game => (
            <tr key={game._id}>
              <td>{game.title}</td>
              <td>{game.rounds?.length || 0}</td>
              <td>
                {hasPermission('EDIT') && (
                  <Link to={`/admin/games/${game._id}`} className={common.editBtn}>Edit</Link>
                )}
                {hasPermission('CREATE') && (
                  <button onClick={() => handleDelete(game._id)} className={common.deleteBtn}>Delete</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

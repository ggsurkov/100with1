import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import common from './pagesStyles.module.scss';
import styles from './TeamsAdmin.module.scss';

export default function TeamEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    api.get(`/teams/${id}`).then(({ data }) => {
      setTitle(data.title);
      setDescription(data.description || '');
    }).catch(() => {
      toast.error('Failed to load team data');
    });
  }, [id]);

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Ошибка: Название команды не может быть пустым');
      return;
    }

    try {
      await api.put(`/teams/${id}`, { title, description });
      toast.success('Команда успешно обновлена!');
      navigate('/admin/teams');
    } catch (error: any) {
      if (error.response?.data?.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('Ошибка при обновлении команды на сервере');
      }
    }
  };

  return (
    <div className={common.card}>
      <h2 className={common.title}>Edit Team</h2>
      <form onSubmit={handleUpdate} className={common.form}>
        <input
          placeholder="Team Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className={common.input}
        />
        <input
          placeholder="Description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className={common.input}
        />
      </form>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
        <button type="button" onClick={() => navigate('/admin/teams')} className={common.button} style={{ background: 'rgba(255,255,255,0.1)' }}>
          Cancel
        </button>
        {hasPermission('EDIT') && (
          <button type="button" onClick={handleUpdate} className={common.button}>
            Save Changes
          </button>
        )}
      </div>
    </div>
  );
}

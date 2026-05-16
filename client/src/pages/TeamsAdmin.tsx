import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import common from './pagesStyles.module.scss';
import styles from './TeamsAdmin.module.scss';

interface Team {
  _id: string;
  title: string;
  description: string;
}

export default function TeamsAdmin() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchTeams = async () => {
    const { data } = await api.get('/teams');
    setTeams(data);
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/teams', { title, description });
    setTitle('');
    setDescription('');
    fetchTeams();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/teams/${id}`);
    fetchTeams();
  };

  return (
    <div className={common.card}>
      <h2 className={common.title}>Manage Teams</h2>
      <form onSubmit={handleSubmit} className={common.form}>
        <input 
          placeholder="Team Title" 
          value={title} 
          onChange={e => setTitle(e.target.value)} 
          className={common.input} 
          required 
        />
        <input 
          placeholder="Description" 
          value={description} 
          onChange={e => setDescription(e.target.value)} 
          className={common.input} 
        />
        <button type="submit" className={common.button}>Add Team</button>
      </form>

      <table className={common.table}>
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map(team => (
            <tr key={team._id}>
              <td>{team.title}</td>
              <td>{team.description}</td>
              <td>
                <Link to={`/admin/teams/${team._id}`} className={common.editBtn}>Edit</Link>
                <button onClick={() => handleDelete(team._id)} className={common.deleteBtn}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

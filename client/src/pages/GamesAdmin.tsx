import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import common from './pagesStyles.module.scss';
import styles from './GamesAdmin.module.scss';

export default function GamesAdmin() {
  const { hasPermission } = useAuth();
  const [games, setGames] = useState<any[]>([]);

  const fetchGames = async () => {
    const { data } = await api.get('/games');
    setGames(data);
  };

  useEffect(() => {
    fetchGames();
  }, []);

  const handleDelete = async (id: string) => {
    await api.delete(`/games/${id}`);
    fetchGames();
  };

  return (
    <div className={common.card}>
      <div className={styles.headerRow}>
        <h2 className={styles.pageTitle}>Manage Games</h2>
        {hasPermission('CREATE') && (
          <Link to="/admin/games/new" className={styles.createBtn}>
            + Создать игру
          </Link>
        )}
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

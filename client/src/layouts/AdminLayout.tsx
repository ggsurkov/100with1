import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import styles from './AdminLayout.module.scss';

export default function AdminLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/admin/teams" className={styles.logo}>100 to 1 Admin</Link>
        <nav className={styles.nav}>
          <Link to="/admin/teams">Teams</Link>
          <Link to="/admin/games">Games</Link>
          <Link to="/games" className={styles.gameMode}>Play Mode</Link>
          <button onClick={logout} className={styles.logout}>Logout</button>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

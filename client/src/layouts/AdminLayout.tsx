import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AdminLayout.module.scss';

export default function AdminLayout() {
  const navigate = useNavigate();
  const { logout, isAdmin } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link to="/admin/teams" className={styles.logo}>100 to 1 Admin</Link>
        <nav className={styles.nav}>
          <Link to="/admin/teams">Teams</Link>
          <Link to="/admin/games">Games</Link>
          {isAdmin() && <Link to="/admin/users">Users</Link>}
          <Link to="/games" className={styles.gameMode}>Play Mode</Link>
          <button onClick={handleLogout} className={styles.logout}>Logout</button>
        </nav>
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

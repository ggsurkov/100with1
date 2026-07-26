import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { DEFAULT_PERMISSIONS_BY_ROLE, Permission, UserRole } from '../types/auth';
import common from './pagesStyles.module.scss';
import styles from './UsersManagement.module.scss';

interface ManagedUser {
  _id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  createdAt?: string;
}

const ALL_PERMISSIONS: Permission[] = ['CREATE', 'EDIT', 'VIEW'];
const ALL_ROLES: UserRole[] = ['admin', 'editor', 'member'];

export default function UsersManagement() {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('member');
  const [permissions, setPermissions] = useState<Permission[]>(DEFAULT_PERMISSIONS_BY_ROLE.member);

  const fetchUsers = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch {
      toast.error('Failed to load users');
    }
  };

  useEffect(() => {
    if (isAdmin()) fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isAdmin()) {
    return <Navigate to="/admin/teams" replace />;
  }

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setPermissions(DEFAULT_PERMISSIONS_BY_ROLE[newRole]);
  };

  const togglePermission = (permission: Permission) => {
    setPermissions(prev =>
      prev.includes(permission) ? prev.filter(p => p !== permission) : [...prev, permission]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email и пароль обязательны');
      return;
    }
    try {
      await api.post('/users', { email, password, role, permissions });
      toast.success('Пользователь создан');
      setEmail('');
      setPassword('');
      setRole('member');
      setPermissions(DEFAULT_PERMISSIONS_BY_ROLE.member);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось создать пользователя');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Не удалось удалить пользователя');
    }
  };

  return (
    <div className={common.card}>
      <h2 className={common.title}>Users</h2>

      <form onSubmit={handleCreate} className={styles.formSection}>
        <div className={common.row}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={common.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={common.input}
          />
          <select
            value={role}
            onChange={e => handleRoleChange(e.target.value as UserRole)}
            className={styles.roleSelect}
          >
            {ALL_ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className={styles.permissionsRow}>
          {ALL_PERMISSIONS.map(permission => (
            <label key={permission} className={styles.permissionLabel}>
              <input
                type="checkbox"
                checked={permissions.includes(permission)}
                onChange={() => togglePermission(permission)}
              />
              {permission}
            </label>
          ))}
        </div>

        <button type="submit" className={common.button}>Create User</button>
      </form>

      <table className={common.table}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Permissions</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user._id}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.permissions?.join(', ')}</td>
              <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
              <td>
                <button onClick={() => handleDelete(user._id)} className={common.deleteBtn}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

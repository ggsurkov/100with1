import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import styles from './LaunchModal.module.scss';

interface Team {
  _id: string;
  title: string;
}

interface LaunchModalProps {
  gameId: string;
  onClose: () => void;
}

export default function LaunchModal({ gameId, onClose }: LaunchModalProps) {
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [joinedTeams, setJoinedTeams] = useState<Team[]>([]);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/teams').then(({ data }) => setAllTeams(data));
  }, []);

  const availableTeams = allTeams.filter(t => !joinedTeams.find(jt => jt._id === t._id));
  const filteredAvailable = availableTeams.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  const toggleTeam = (team: Team, action: 'join' | 'leave') => {
    if (action === 'join') {
      setJoinedTeams([...joinedTeams, team]);
    } else {
      setJoinedTeams(joinedTeams.filter(t => t._id !== team._id));
    }
  };

  const handleLaunch = async () => {
    if (joinedTeams.length === 0) return;
    
    try {
      const payload = {
        gameId,
        joinedTeamIds: joinedTeams.map(t => t._id),
        teamGameInfo: joinedTeams.map(t => ({ teamId: t._id, teamPoints: 0, teamTitle: t.title }))
      };
      const { data } = await api.post('/launches', payload);
      toast.success('Game Launched!');
      navigate(`/launch/${data._id}/rounds`);
    } catch (error) {
      toast.error('Failed to launch game');
    }
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2>Setup Launch</h2>
        <div className={styles.columns}>
          <div className={styles.column}>
            <h3>Available Teams</h3>
            <input 
              placeholder="Search teams..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              className={styles.searchInput}
            />
            <div className={styles.teamList}>
              {filteredAvailable.map(team => (
                <div key={team._id} className={styles.teamItem} onClick={() => toggleTeam(team, 'join')}>
                  {team.title}
                  <span>+</span>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.column}>
            <h3>Joined Teams ({joinedTeams.length})</h3>
            <div className={styles.teamList}>
              {joinedTeams.map(team => (
                <div key={team._id} className={`${styles.teamItem} ${styles.joined}`} onClick={() => toggleTeam(team, 'leave')}>
                  {team.title}
                  <span>-</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <button onClick={onClose} className={styles.cancelBtn}>Cancel</button>
          <button 
            onClick={handleLaunch} 
            className={styles.launchBtn}
            disabled={joinedTeams.length === 0}
          >
            Launch!
          </button>
        </div>
      </div>
    </div>
  );
}

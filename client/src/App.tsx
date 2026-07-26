import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './layouts/AdminLayout';
import TeamsAdmin from './pages/TeamsAdmin';
import TeamEdit from './pages/TeamEdit';
import GamesAdmin from './pages/GamesAdmin';
import GameEdit from './pages/GameEdit';
import UsersManagement from './pages/UsersManagement';
import GamesList from './pages/GamesList';
import GameRounds from './pages/GameRounds';
import RoundStart from './pages/RoundStart';
import RoundCheck from './pages/RoundCheck';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="teams" element={<TeamsAdmin />} />
          <Route path="teams/:id" element={<TeamEdit />} />
          <Route path="games" element={<GamesAdmin />} />
          <Route path="games/:id" element={<GameEdit />} />
          <Route path="users" element={<UsersManagement />} />
        </Route>

        {/* Game Mode */}
        <Route path="/games" element={<GamesList />} />
        <Route path="/game/:id/rounds" element={<GameRounds />} />
        <Route path="/launch/:launchId/rounds" element={<GameRounds />} />
        <Route path="/game/:id/round/:roundId/start" element={<RoundStart />} />
        <Route path="/game/:id/round/:roundId/check" element={<RoundCheck />} />
        <Route path="/launch/:launchId/round/:roundId/start" element={<RoundStart />} />
        <Route path="/launch/:launchId/round/:roundId/check" element={<RoundCheck />} />
        
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </Router>
  );
}

export default App;

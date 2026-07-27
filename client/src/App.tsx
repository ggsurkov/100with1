import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import ResultsPage from './pages/ResultsPage';
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
import TeamChoosePage from './pages/TeamChoosePage';
import CaptainPlayPage from './pages/CaptainPlayPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={<Login />} />
        <Route path="/results" element={<ResultsPage />} />

        <Route path="/admin" element={<AdminLayout />}>
          <Route path="teams" element={<TeamsAdmin />} />
          <Route path="teams/:id" element={<TeamEdit />} />
          <Route path="games" element={<GamesAdmin />} />
          <Route path="games/new" element={<GameEdit />} />
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

        {/* Team captain devices */}
        <Route path="/launch/:launchId/join" element={<TeamChoosePage />} />
        <Route path="/launch/:launchId/play" element={<CaptainPlayPage />} />

        <Route path="/" element={<LandingPage />} />
      </Routes>
    </Router>
  );
}

export default App;

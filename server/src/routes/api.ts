import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import QRCode from 'qrcode';
import User, { DEFAULT_PERMISSIONS_BY_ROLE } from '../models/User';
import Team from '../models/Team';
import Game from '../models/Game';
import Launch from '../models/Launch';
import TeamAnswer from '../models/TeamAnswer';
import upload from '../middleware/upload';
import { authMiddleware, requireRole, requirePermission, JWT_SECRET } from '../middleware/auth';
import { getClientBaseUrl } from '../utils/url';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase().trim() });

  if (user && (await bcrypt.compare(password || '', user.passwordHash))) {
    const payload = { id: user._id, email: user.email, role: user.role, permissions: user.permissions };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token, user: payload });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// User management (admin/master only)
router.get('/users', authMiddleware, requireRole(['admin', 'master']), async (req: any, res) => {
  const users = await User.find({ _id: { $ne: req.user.id } }).select('-passwordHash');
  res.json(users);
});

router.post('/users', authMiddleware, requireRole(['admin', 'master']), async (req, res) => {
  const { email, password, role, permissions } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }
  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({
      email: String(email).toLowerCase().trim(),
      passwordHash,
      role: role || 'member',
      permissions,
    });
    await user.save();
    const { passwordHash: _omit, ...safeUser } = user.toObject();
    res.json(safeUser);
  } catch (e: any) {
    if (e.code === 11000) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }
    res.status(400).json({ message: 'Failed to create user' });
  }
});

router.delete('/users/:id', authMiddleware, requireRole(['admin', 'master']), requirePermission('CREATE'), async (req: any, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }
  if (id === req.user.id) {
    return res.status(400).json({ message: 'You cannot delete your own account' });
  }
  await User.findByIdAndDelete(id);
  res.json({ message: 'Deleted' });
});

// Teams CRUD
router.get('/teams', authMiddleware, requirePermission('VIEW'), async (req, res) => {
  const teams = await Team.find();
  res.json(teams);
});

router.get('/teams/:id', async (req, res) => {
  const team = await Team.findById(req.params.id);
  res.json(team);
});

const validateTeam = (req: any, res: any, next: any) => {
  const { title } = req.body;
  if (!title || typeof title !== 'string' || title.trim() === '') {
    return res.status(400).json({ message: 'SERVER VALIDATION ERROR' });
  }
  next();
};

router.post('/teams', authMiddleware, requirePermission('CREATE'), validateTeam, async (req, res) => {
  const team = new Team(req.body);
  await team.save();
  res.json(team);
});

router.put('/teams/:id', authMiddleware, requirePermission('EDIT'), validateTeam, async (req, res) => {
  const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(team);
});

router.delete('/teams/:id', authMiddleware, requirePermission('CREATE'), async (req, res) => {
  await Team.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Image upload
router.post('/upload', authMiddleware, requirePermission('CREATE'), (req: any, res) => {
  upload.single('image')(req, res, (err: any) => {
    if (err) {
      console.error('[Upload] Error:', err.message);
      return res.status(400).json({ message: 'Upload failed', error: err.message });
    }
    if (!req.file) return res.status(400).json({ message: 'No file provided' });
    res.json({ imageUrl: req.file.path });
  });
});

// Games CRUD
const validateGame = (req: any, res: any, next: any) => {
  const { rounds } = req.body;
  if (rounds && Array.isArray(rounds)) {
    for (const round of rounds) {
      if (!round.questions || round.questions.length === 0) {
        return res.status(400).json({ message: 'SERVER VALIDATION ERROR', details: 'Round has no questions' });
      }
      for (const question of round.questions) {
        if (!question.title || question.title.trim() === '') {
          return res.status(400).json({ message: 'SERVER VALIDATION ERROR', details: 'Question title is empty' });
        }
        if (!question.answers || question.answers.length === 0) {
          return res.status(400).json({ message: 'SERVER VALIDATION ERROR', details: 'Question has no answers' });
        }
        for (const answer of question.answers) {
          if (!answer.text || answer.text.trim() === '') {
            return res.status(400).json({ message: 'SERVER VALIDATION ERROR', details: 'Answer text is empty' });
          }
        }
      }
    }
  }
  next();
};
router.get('/games', authMiddleware, requirePermission('VIEW'), async (req, res) => {
  const games = await Game.find();
  res.json(games);
});

router.get('/games/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined') return res.status(400).json({ message: 'Invalid ID provided' });
  try {
    const game = await Game.findById(id);
    res.json(game);
  } catch (e) {
    res.status(400).json({ message: 'Invalid ID provided' });
  }
});

router.post('/games', authMiddleware, requirePermission('CREATE'), validateGame, async (req, res) => {
  const game = new Game(req.body);
  await game.save();
  res.json(game);
});

router.put('/games/:id', authMiddleware, requirePermission('EDIT'), validateGame, async (req, res) => {
  const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(game);
});

router.delete('/games/:id', authMiddleware, requirePermission('CREATE'), async (req, res) => {
  await Game.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Launches CRUD
// Public: powers the /results page — exposes only finished games (final scores), no auth required.
router.get('/launches', async (req, res) => {
  const launches = await Launch.find({ status: 'finished' })
    .populate('gameId', 'title')
    .sort({ finishedAt: -1 });
  res.json(launches);
});

router.post('/launches', authMiddleware, requirePermission('CREATE'), async (req, res) => {
  const { gameId } = req.body;
  if (!gameId || gameId === 'undefined') return res.status(400).json({ message: 'Invalid gameId provided' });
  try {
    const launchId = new mongoose.Types.ObjectId();
    const clientUrl = getClientBaseUrl(req);
    const joinUrl = `${clientUrl}/launch/${launchId}/join`;
    const qrCode = await QRCode.toDataURL(joinUrl);

    const launch = new Launch({ ...req.body, _id: launchId, qrCode });
    await launch.save();
    res.json(launch);
  } catch (e) {
    res.status(400).json({ message: 'Failed to create launch' });
  }
});

router.get('/launches/:id', authMiddleware, requirePermission('VIEW'), async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined') return res.status(400).json({ message: 'Invalid ID provided' });
  try {
    const launch = await Launch.findById(id).populate('gameId');
    res.json(launch);
  } catch (e) {
    res.status(400).json({ message: 'Invalid ID provided' });
  }
});

router.put('/launches/:id', authMiddleware, requirePermission('EDIT'), async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined') return res.status(400).json({ message: 'Invalid ID provided' });
  try {
    const update = { ...req.body };
    if (update.status === 'finished') {
      update.finishedAt = new Date();
    }
    const launch = await Launch.findByIdAndUpdate(id, update, { new: true });
    res.json(launch);
  } catch (e) {
    res.status(400).json({ message: 'Failed to update launch' });
  }
});

router.delete('/launches/:id', authMiddleware, requirePermission('CREATE'), async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined' || !mongoose.isValidObjectId(id)) {
    return res.status(400).json({ message: 'Invalid ID provided' });
  }
  await Launch.findByIdAndDelete(id);
  res.json({ message: 'Deleted' });
});

// ---- Captain devices (public, unauthenticated) ----
// Powers the QR/PIN join flow and the real-time answer submission from team
// captains' own phones — none of them hold a JWT, so these stay outside authMiddleware.

// Public: team-selection screen (TeamChoosePage) needs the roster + which
// captains already claimed a team, without exposing anything auth-gated.
router.get('/launches/:id/teams', async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID provided' });
  try {
    const launch = await Launch.findById(id).select('teamGameInfo gameId status').populate('gameId', 'title');
    if (!launch) return res.status(404).json({ message: 'Launch not found' });
    res.json({
      gameTitle: (launch.gameId as any)?.title || '',
      status: launch.status,
      teams: launch.teamGameInfo.map((t: any) => ({
        teamId: t.teamId,
        teamTitle: t.teamTitle,
        capitanActive: !!t.capitanActive,
      })),
    });
  } catch (e) {
    res.status(400).json({ message: 'Invalid ID provided' });
  }
});

// Public: 3s polling endpoint for CaptainPlayPage. Deliberately minimal —
// no timerSeconds, no scores, no other teams' data.
router.get('/launches/:id/state', async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID provided' });
  try {
    const launch = await Launch.findById(id).populate('gameId');
    if (!launch) return res.status(404).json({ message: 'Launch not found' });

    let question: { title: string; imageUrl?: string } | null = null;
    if (launch.currentRoundId && launch.currentQuestionId) {
      const game: any = launch.gameId;
      const round = game?.rounds?.find((r: any) => String(r._id) === String(launch.currentRoundId));
      const q = round?.questions?.find((q: any) => String(q._id) === String(launch.currentQuestionId));
      if (q) question = { title: q.title, imageUrl: q.imageUrl };
    }

    res.json({
      launchId: launch._id,
      currentRoundId: launch.currentRoundId || null,
      currentQuestionId: launch.currentQuestionId || null,
      isTimerActive: launch.isTimerActive,
      question,
    });
  } catch (e) {
    res.status(400).json({ message: 'Invalid ID provided' });
  }
});

router.post('/launches/:id/join', async (req, res) => {
  const { id } = req.params;
  const { teamId, pin } = req.body;
  if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID provided' });
  if (!teamId || !mongoose.isValidObjectId(teamId) || !pin) {
    return res.status(400).json({ message: 'teamId and pin are required' });
  }
  try {
    const launch = await Launch.findById(id);
    if (!launch) return res.status(404).json({ message: 'Launch not found' });

    const teamInfo = launch.teamGameInfo.find((t: any) => String(t.teamId) === String(teamId));
    if (!teamInfo) return res.status(404).json({ message: 'Team is not part of this launch' });

    const team = await Team.findById(teamId);
    if (!team || team.pin !== String(pin).trim()) {
      return res.status(400).json({ message: 'Invalid PIN' });
    }

    teamInfo.capitanActive = true;
    await launch.save();

    const existingAnswer = await TeamAnswer.findOne({ launchId: id, teamId });
    if (!existingAnswer) {
      await TeamAnswer.create({ launchId: id, gameId: launch.gameId, teamId, answers: [] });
    }

    res.json({ message: 'Joined' });
  } catch (e) {
    res.status(400).json({ message: 'Failed to join launch' });
  }
});

router.put('/launches/:id/answers', async (req, res) => {
  const { id } = req.params;
  const { teamId, roundId, questionId, answerText } = req.body;
  if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID provided' });
  if (!teamId || !mongoose.isValidObjectId(teamId) || !roundId || !questionId) {
    return res.status(400).json({ message: 'teamId, roundId and questionId are required' });
  }
  try {
    let teamAnswer = await TeamAnswer.findOne({ launchId: id, teamId });
    if (!teamAnswer) {
      const launch = await Launch.findById(id);
      if (!launch) return res.status(404).json({ message: 'Launch not found' });
      teamAnswer = await TeamAnswer.create({ launchId: id, gameId: launch.gameId, teamId, answers: [] });
    }

    const existing = teamAnswer.answers.find((a: any) => a.roundId === roundId && a.questionId === questionId);
    if (existing) {
      existing.answerText = answerText || '';
      existing.updatedAt = new Date();
    } else {
      teamAnswer.answers.push({ roundId, questionId, answerText: answerText || '', updatedAt: new Date() });
    }
    await teamAnswer.save();

    res.json(teamAnswer);
  } catch (e) {
    res.status(400).json({ message: 'Failed to save answer' });
  }
});

// Host-facing: powers the "captains' answers" column in RoundCheck.
router.get('/launches/:id/answers', authMiddleware, requirePermission('VIEW'), async (req, res) => {
  const { id } = req.params;
  if (!id || !mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid ID provided' });
  try {
    const answers = await TeamAnswer.find({ launchId: id }).populate('teamId', 'title');
    res.json(answers);
  } catch (e) {
    res.status(400).json({ message: 'Invalid ID provided' });
  }
});

export default router;

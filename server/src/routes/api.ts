import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';
import User, { DEFAULT_PERMISSIONS_BY_ROLE } from '../models/User';
import Team from '../models/Team';
import Game from '../models/Game';
import Launch from '../models/Launch';
import upload from '../middleware/upload';
import { authMiddleware, requireRole, requirePermission, JWT_SECRET } from '../middleware/auth';

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
router.post('/launches', authMiddleware, requirePermission('CREATE'), async (req, res) => {
  const { gameId } = req.body;
  if (!gameId || gameId === 'undefined') return res.status(400).json({ message: 'Invalid gameId provided' });
  try {
    const launch = new Launch(req.body);
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
    const launch = await Launch.findByIdAndUpdate(id, req.body, { new: true });
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

export default router;

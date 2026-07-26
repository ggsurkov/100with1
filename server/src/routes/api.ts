import express from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';
import Team from '../models/Team';
import Game from '../models/Game';
import Launch from '../models/Launch';
import upload from '../middleware/upload';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

// Auth middleware
const authMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  
  if (admin && admin.passwordHash === password) {
    const token = jwt.sign({ id: admin._id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Teams CRUD
router.get('/teams', async (req, res) => {
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

router.post('/teams', authMiddleware, validateTeam, async (req, res) => {
  const team = new Team(req.body);
  await team.save();
  res.json(team);
});

router.put('/teams/:id', authMiddleware, validateTeam, async (req, res) => {
  const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(team);
});

router.delete('/teams/:id', authMiddleware, async (req, res) => {
  await Team.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Image upload
router.post('/upload', authMiddleware, (req: any, res) => {
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
router.get('/games', async (req, res) => {
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

router.post('/games', authMiddleware, validateGame, async (req, res) => {
  const game = new Game(req.body);
  await game.save();
  res.json(game);
});

router.put('/games/:id', authMiddleware, validateGame, async (req, res) => {
  const game = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(game);
});

router.delete('/games/:id', authMiddleware, async (req, res) => {
  await Game.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Launches CRUD
router.post('/launches', authMiddleware, async (req, res) => {
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

router.get('/launches/:id', async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined') return res.status(400).json({ message: 'Invalid ID provided' });
  try {
    const launch = await Launch.findById(id).populate('gameId');
    res.json(launch);
  } catch (e) {
    res.status(400).json({ message: 'Invalid ID provided' });
  }
});

router.put('/launches/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  if (!id || id === 'undefined') return res.status(400).json({ message: 'Invalid ID provided' });
  try {
    const launch = await Launch.findByIdAndUpdate(id, req.body, { new: true });
    res.json(launch);
  } catch (e) {
    res.status(400).json({ message: 'Failed to update launch' });
  }
});

export default router;

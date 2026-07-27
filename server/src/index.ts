import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import apiRoutes from './routes/api';
import { seedAdmin, seedTeamPins } from './seeder';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/100with1')
  .then(async () => {
    console.log('Connected to MongoDB');
    await seedAdmin();
    await seedTeamPins();
  })
  .catch(err => console.error('MongoDB connection error:', err));

app.use('/api', apiRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

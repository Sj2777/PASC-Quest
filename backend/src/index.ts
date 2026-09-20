import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import adminRouter from './routes/admin';
import pollRouter from './routes/poll';
import studentRouter from './routes/student';
import { startScheduler } from './jobs/scheduler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow frontend origin with credentials
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/admin', adminRouter);
app.use('/admin', adminRouter);
app.use('/api/poll', pollRouter);
app.use('/api/student', studentRouter);

// Start auto-launch scheduler
startScheduler();

app.get('/api/ping', (_req, res) => {
  console.log('>>> ping hit');
  res.json({ pong: true });
});

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export default app;

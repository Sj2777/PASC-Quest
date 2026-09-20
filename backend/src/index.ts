import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import adminRouter from './routes/admin';
import pollRouter from './routes/poll';
import studentRouter from './routes/student';

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
app.use('/api/poll', pollRouter);
app.use('/api/student', studentRouter);

app.listen(PORT, () => {
  console.log(`QuizPop backend running on http://localhost:${PORT}`);
});

export default app;

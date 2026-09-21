import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler';
import { authRoutes } from './routes/auth';
import { resourceRoutes } from './routes/resources';
import { requirementRoutes } from './routes/requirements';
import { searchRoutes } from './routes/search';
import { loanRoutes } from './routes/loans';
import { aiRoutes } from './routes/ai';
import { adminRoutes } from './routes/admin';
import { impactRoutes } from './routes/impact';
import { notificationRoutes } from './routes/notifications';
import { ragRoutes } from './routes/rag';
import { purchaseRoutes } from './routes/purchases';
import { userRoutes } from './routes/users';
import { statsRoutes } from './routes/stats';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Auth specific rate limit
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many authentication attempts, please try again in a few minutes.' }
});

app.use(cors({
  origin: (origin, callback) => {
    // allow requests with no origin (mobile, curl) or localhost/127.0.0.1 on any port
    if (
      !origin ||
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
      origin === process.env.FRONTEND_URL
    ) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// Static files for uploads
app.use('/uploads', express.static('uploads'));

// Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/impact', impactRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/rag', ragRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/users', userRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    aiMode: process.env.AI_MODE || 'mock'
  });
});

// Error handler
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 CampusLoop API running on port ${PORT}`);
  console.log(`🤖 AI Mode: ${process.env.AI_MODE || 'mock'}`);
});

export default app;

/**
 * Main Application Entry Point
 * Refactored with Dependency Injection & SOLID principles
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
require('dotenv').config();

// Validate critical environment variables
if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'default_secret_change_this_in_production') {
  logger.error('❌ FATAL: JWT_SECRET must be set in environment variables!');
  logger.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
}

if (!process.env.GOOGLE_API_KEY && !process.env.GROQ_API_KEY) {
  logger.warn('⚠️  WARNING: No AI API keys found. AI features will not work.');
}

// Import DI Container
const { getContainer } = require('./config/DIContainer');

// Import route factories
const createAuthRoutes = require('./routes/authRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createSubjectRoutes = require('./routes/subjectRoutes');
const createDocumentRoutes = require('./routes/documentRoutes');
const createConceptRoutes = require('./routes/conceptRoutes');
const createShareRoutes = require('./routes/shareRoutes');
const createQuizRoutes = require('./routes/quizRoutes');
const createQuizResultRoutes = require('./routes/quizResultRoutes');
const createKnowledgeGapRoutes = require('./routes/knowledgeGapRoutes');
const createRoadmapRoutes = require('./routes/roadmapRoutes');
const createPersonalReviewRoutes = require('./routes/personalReviewRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration - MUST be before helmet
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Security Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Allow frontend to load resources
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
});

app.use(limiter);

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit JSON payload size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize DI Container
const container = getContainer();

// Routes (with rate limiting for auth)
app.use('/api/auth', authLimiter, createAuthRoutes(container));
app.use('/api/users', createUserRoutes(container));
app.use('/api/subjects', createSubjectRoutes(container));
app.use('/api/documents', createDocumentRoutes(container));
app.use('/api/concepts', createConceptRoutes(container));
app.use('/api/shares', createShareRoutes(container));
app.use('/api/quiz', createQuizRoutes(container));
app.use('/api/quiz-result', createQuizResultRoutes(container));
app.use('/api/knowledge-gap', createKnowledgeGapRoutes(container));
app.use('/api/roadmap', createRoadmapRoutes(container));
app.use('/api/review', createPersonalReviewRoutes(container));

// Health check
app.get('/', (req, res) => {
  res.send('🚀 AI Personal Brain Server is running!');
});

// Health check with database
app.get('/health', async (req, res) => {
  try {
    const prisma = container.getPrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'error',
      database: 'disconnected',
      timestamp: new Date().toISOString()
    });
  }
});

// Test API (deprecated - for backwards compatibility)
app.post('/api/test-ai', async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Cần gửi nội dung (message)' });
    }

    const aiService = container.getAIService();
    const answer = await aiService.ask(message);

    res.json({
      input: message,
      ai_answer: answer,
      timestamp: new Date(),
    });
  } catch (error) {
    next(error);
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global Error Handler (phải để cuối cùng)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🔥 Server đang chạy tại: http://localhost:${PORT}`);
  logger.info(`📝 Môi trường: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔒 Security: Helmet + Rate Limiting enabled`);
  logger.info(`🗄️  Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`👋 Received ${signal}, shutting down gracefully...`);
  try {
    const container = getContainer();
    await container.destroy();
    logger.info('✅ Cleanup completed');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
/**
 * Main Application Entry Point
 * Refactored with Dependency Injection & SOLID principles
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Import DI Container
const { getContainer } = require('./config/DIContainer');

// Import route factories
const createAuthRoutes = require('./routes/authRoutes');
const createUserRoutes = require('./routes/userRoutes');
const createSubjectRoutes = require('./routes/subjectRoutes');
const createDocumentRoutes = require('./routes/documentRoutes');
const createConceptRoutes = require('./routes/conceptRoutes');
const createShareRoutes = require('./routes/shareRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Initialize DI Container
const container = getContainer();

// Routes
app.use('/api/auth', createAuthRoutes(container));
app.use('/api/users', createUserRoutes(container));
app.use('/api/subjects', createSubjectRoutes(container));
app.use('/api/documents', createDocumentRoutes(container));
app.use('/api/concepts', createConceptRoutes(container));
app.use('/api/shares', createShareRoutes(container));

// Health check
app.get('/', (req, res) => {
  res.send('🚀 AI Personal Brain Server is running!');
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
  console.log(`\n🔥 Server đang chạy tại: http://localhost:${PORT}`);
  console.log(`📝 Môi trường: ${process.env.NODE_ENV || 'development'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n👋 Đang tắt server...');
  // await container.destroy();
  process.exit(0);
});
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ai-personal-brain-server' },
  transports: [
    // Ghi lỗi ra file riêng
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    // Ghi tất cả log ra file chung
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

// Nếu không phải production thì in màu mè ra console cho dễ nhìn
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    ),
  }));
}

module.exports = logger;
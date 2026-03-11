const { Queue } = require('bullmq');
const logger = require('../utils/logger');

/**
 * QueueService - BullMQ-based job queue for background processing
 * Handles PDF processing, concept extraction, and other heavy tasks
 */
class QueueService {
  constructor() {
    this.queues = {};
    this.connection = null;
    this.isConnected = false;
  }

  /**
   * Initialize queue connection
   */
  async connect() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Parse Redis URL
      const url = new URL(redisUrl);
      this.connection = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
      };

      logger.info('✅ Queue service initialized with Redis connection');
      this.isConnected = true;
    } catch (error) {
      logger.error('Failed to initialize queue service:', error);
      this.isConnected = false;
    }
  }

  /**
   * Get or create a queue
   * @param {string} queueName - Name of the queue
   * @returns {Queue}
   */
  getQueue(queueName) {
    if (!this.isConnected) {
      throw new Error('Queue service not connected. Call connect() first.');
    }

    if (!this.queues[queueName]) {
      this.queues[queueName] = new Queue(queueName, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3, // Retry 3 times if failed
          backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds, then 4, 8...
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000, // Keep max 1000 completed jobs
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // Keep failed jobs for 7 days
          },
        },
      });

      logger.info(`Queue "${queueName}" created`);
    }

    return this.queues[queueName];
  }

  /**
   * Add PDF processing job
   * @param {object} jobData - Job data
   * @param {string} jobData.documentId - Document ID
   * @param {string} jobData.filePath - Path to PDF file
   * @param {string} jobData.subjectId - Subject ID
   * @param {string} jobData.title - Document title
   * @returns {Promise<object>} - Job info
   */
  async addPdfProcessingJob(jobData) {
    try {
      const queue = this.getQueue('pdf-processing');
      
      const job = await queue.add('process-pdf', jobData, {
        jobId: `pdf-${jobData.documentId}`, // Prevent duplicate jobs
        priority: 1, // Higher priority for PDF jobs
      });

      logger.info(`PDF processing job added: ${job.id} for document ${jobData.documentId}`);
      
      return {
        jobId: job.id,
        documentId: jobData.documentId,
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to add PDF processing job:', error);
      throw error;
    }
  }

  /**
   * Add web clip processing job
   * @param {object} jobData - Job data
   * @param {string} jobData.userId - Owner user ID
   * @param {string} jobData.subjectId - Subject ID
   * @param {string} jobData.text - Highlighted text content
   * @param {string} jobData.sourceUrl - Source page URL
   * @param {string} jobData.sourceTitle - Source page title
   * @returns {Promise<object>} - Job info
   */
  async addWebClipProcessingJob(jobData) {
    try {
      const queue = this.getQueue('web-clip-processing');

      const hashSource = `${jobData.subjectId}:${jobData.sourceUrl || ''}:${jobData.text || ''}`;
      const hash = Buffer.from(hashSource).toString('base64').slice(0, 24).replace(/[^a-zA-Z0-9]/g, 'x');

      const job = await queue.add('process-web-clip', jobData, {
        jobId: `webclip-${hash}-${Date.now()}`,
        priority: 2,
      });

      logger.info(`Web clip processing job added: ${job.id} for subject ${jobData.subjectId}`);

      return {
        jobId: job.id,
        status: 'pending',
      };
    } catch (error) {
      logger.error('Failed to add web clip processing job:', error);
      throw error;
    }
  }

  /**
   * Get job status
   * @param {string} queueName - Queue name
   * @param {string} jobId - Job ID
   * @returns {Promise<object>} - Job status
   */
  async getJobStatus(queueName, jobId) {
    try {
      const queue = this.getQueue(queueName);
      const job = await queue.getJob(jobId);

      if (!job) {
        return { status: 'not_found' };
      }

      const state = await job.getState();
      const progress = job.progress;

      return {
        jobId: job.id,
        status: state,
        progress,
        data: job.data,
        returnValue: job.returnvalue,
        failedReason: job.failedReason,
        finishedOn: job.finishedOn,
        processedOn: job.processedOn,
      };
    } catch (error) {
      logger.error(`Failed to get job status for ${jobId}:`, error);
      return { status: 'error', error: error.message };
    }
  }

  /**
   * Get queue statistics
   * @param {string} queueName - Queue name
   * @returns {Promise<object>} - Queue stats
   */
  async getQueueStats(queueName) {
    try {
      const queue = this.getQueue(queueName);
      
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return {
        queue: queueName,
        waiting,
        active,
        completed,
        failed,
        delayed,
        total: waiting + active + completed + failed + delayed,
      };
    } catch (error) {
      logger.error(`Failed to get queue stats for ${queueName}:`, error);
      return { error: error.message };
    }
  }

  /**
   * Clean up old jobs
   * @param {string} queueName - Queue name
   */
  async cleanQueue(queueName) {
    try {
      const queue = this.getQueue(queueName);
      
      // Clean completed jobs older than 1 hour
      await queue.clean(3600 * 1000, 1000, 'completed');
      
      // Clean failed jobs older than 7 days
      await queue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
      
      logger.info(`Queue "${queueName}" cleaned`);
    } catch (error) {
      logger.error(`Failed to clean queue ${queueName}:`, error);
    }
  }

  /**
   * Close all queues
   */
  async disconnect() {
    try {
      const closePromises = Object.values(this.queues).map(queue => queue.close());
      await Promise.all(closePromises);
      
      this.queues = {};
      this.isConnected = false;
      
      logger.info('All queues closed');
    } catch (error) {
      logger.error('Error closing queues:', error);
    }
  }
}

// Singleton instance
const queueService = new QueueService();

module.exports = queueService;

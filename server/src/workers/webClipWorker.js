const { Worker } = require('bullmq');
const logger = require('../utils/logger');
const { getPrismaClient } = require('../config/database');
const AIService = require('../services/aiService');
const VectorSearchService = require('../services/vectorSearchService');
const RelationDiscoveryService = require('../services/relationDiscoveryService');

class WebClipWorker {
  constructor() {
    this.worker = null;
    this.connection = null;
    this.prisma = getPrismaClient();
    this.aiService = new AIService();
    this.vectorSearchService = new VectorSearchService(this.prisma, this.aiService);
    this.relationDiscoveryService = new RelationDiscoveryService(this.aiService);
  }

  async start() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const url = new URL(redisUrl);

    this.connection = {
      host: url.hostname,
      port: parseInt(url.port, 10) || 6379,
    };

    this.worker = new Worker(
      'web-clip-processing',
      async (job) => this.processWebClipJob(job),
      {
        connection: this.connection,
        concurrency: 3,
        limiter: {
          max: 10,
          duration: 60000,
        },
      }
    );

    this.worker.on('completed', (job) => {
      logger.info(`Web clip job ${job.id} completed`);
    });

    this.worker.on('failed', (job, err) => {
      logger.error(`Web clip job ${job?.id} failed`, err);
    });

    this.worker.on('error', (err) => {
      logger.error('Web clip worker error:', err);
    });

    logger.info('✅ Web Clip Worker started successfully');
  }

  async processWebClipJob(job) {
    const { subjectId, text, sourceUrl, sourceTitle } = job.data;

    await job.updateProgress(10);

    const safeTitle = String(sourceTitle || 'Web Clip').trim().slice(0, 180) || 'Web Clip';
    const markerUrl = sourceUrl ? String(sourceUrl).slice(0, 1024) : 'unknown';

    const document = await this.prisma.document.create({
      data: {
        title: safeTitle,
        filePath: `__webclip__:${markerUrl}`,
        fileSize: String(text || '').length,
        subjectId,
        processingStatus: 'processing',
      },
    });

    try {
      await job.updateProgress(35);
      const concepts = await this.extractConcepts(text);

      const createdConcepts = [];
      for (const concept of concepts) {
        const created = await this.prisma.concept.create({
          data: {
            term: concept.term,
            definition: concept.definition,
            example: concept.example || null,
            pageNumber: 1,
            documentId: document.id,
          },
        });
        createdConcepts.push(created);
      }

      await job.updateProgress(60);
      const relationCandidates = this.relationDiscoveryService.detectRelations(createdConcepts, [String(text || '')]);

      for (const relation of relationCandidates) {
        const exists = await this.prisma.relation.findFirst({
          where: {
            sourceId: relation.sourceId,
            targetId: relation.targetId,
            type: relation.type,
          },
        });

        if (!exists) {
          await this.prisma.relation.create({
            data: {
              sourceId: relation.sourceId,
              targetId: relation.targetId,
              type: relation.type,
            },
          });
        }
      }

      await job.updateProgress(80);
      await this.vectorSearchService.indexDocument({
        subjectId,
        documentId: document.id,
        rawText: String(text || ''),
        concepts: createdConcepts,
      });

      await job.updateProgress(95);
      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          processingStatus: 'completed',
          processingError: null,
        },
      });

      const cacheService = require('../services/cacheService');
      if (cacheService.enabled) {
        await cacheService.delByPattern(`*:subject:${subjectId}*`);
      }

      await job.updateProgress(100);
      return {
        success: true,
        documentId: document.id,
        conceptsCount: createdConcepts.length,
      };
    } catch (error) {
      await this.prisma.document.update({
        where: { id: document.id },
        data: {
          processingStatus: 'failed',
          processingError: error.message,
        },
      });
      throw error;
    }
  }

  async extractConcepts(text) {
    const content = String(text || '').trim();
    if (!content) return [];

    const prompt = `Phan tich doan text sau va trich xuat cac khái niệm quan trọng.
Tra ve JSON array dung format:
[
  {
    "term": "Ten khai niem",
    "definition": "Dinh nghia ngan gon",
    "example": "Vi du minh hoa neu co"
  }
]

Chi tra ve JSON array, khong giai thich them.
Text:
"""${content.slice(0, 12000)}"""`;

    const aiResponse = await this.aiService.ask(prompt);
    const parsed = this.parseConceptsFromAI(aiResponse);
    return this.deduplicateConcepts(parsed).slice(0, 15);
  }

  parseConceptsFromAI(response) {
    try {
      let jsonStr = String(response || '').trim();
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');

      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (match) {
        jsonStr = match[0];
      }

      const concepts = JSON.parse(jsonStr);
      return concepts
        .filter((c) => c.term && c.definition)
        .map((c) => ({
          term: String(c.term).trim(),
          definition: String(c.definition).trim(),
          example: c.example ? String(c.example).trim() : null,
        }));
    } catch (error) {
      logger.error('Failed to parse web clip AI response:', error);
      return [];
    }
  }

  deduplicateConcepts(concepts) {
    const seen = new Map();

    for (const concept of concepts) {
      const key = concept.term.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, concept);
      } else {
        const existing = seen.get(key);
        if ((concept.definition || '').length > (existing.definition || '').length) {
          seen.set(key, concept);
        }
      }
    }

    return Array.from(seen.values());
  }

  async stop() {
    if (this.worker) {
      await this.worker.close();
      logger.info('Web Clip Worker stopped');
    }
  }
}

module.exports = WebClipWorker;

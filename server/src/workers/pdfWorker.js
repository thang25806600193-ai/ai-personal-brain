const { Worker } = require('bullmq');
const path = require('path');
const logger = require('../utils/logger');
const { getPrismaClient } = require('../config/database');
const AIService = require('../services/aiService');
const VectorSearchService = require('../services/vectorSearchService');
const RelationDiscoveryService = require('../services/relationDiscoveryService');

// PDF parsing utilities
const pdfParse = require('pdf-parse');
const fs = require('fs').promises;

/**
 * PDF Processing Worker
 * Handles background processing of uploaded PDF files
 */
class PdfWorker {
  constructor() {
    this.worker = null;
    this.connection = null;
    this.prisma = getPrismaClient();
    this.aiService = new AIService();
    this.vectorSearchService = new VectorSearchService(this.prisma, this.aiService);
    this.relationDiscoveryService = new RelationDiscoveryService(this.aiService);
  }

  /**
   * Start the worker
   */
  async start() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      // Parse Redis URL
      const url = new URL(redisUrl);
      this.connection = {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
      };

      this.worker = new Worker(
        'pdf-processing',
        async (job) => {
          return await this.processPdfJob(job);
        },
        {
          connection: this.connection,
          concurrency: 2, // Process 2 PDFs concurrently
          limiter: {
            max: 5, // Max 5 jobs
            duration: 60000, // per 60 seconds (to avoid rate limiting AI APIs)
          },
        }
      );

      // Event listeners
      this.worker.on('completed', (job) => {
        logger.info(`Job ${job.id} completed successfully`);
      });

      this.worker.on('failed', (job, err) => {
        logger.error(`Job ${job.id} failed:`, err);
      });

      this.worker.on('error', (err) => {
        logger.error('Worker error:', err);
      });

      logger.info('✅ PDF Worker started successfully');
    } catch (error) {
      logger.error('Failed to start PDF worker:', error);
      throw error;
    }
  }

  /**
   * Process a single PDF job
   * @param {object} job - BullMQ job
   */
  async processPdfJob(job) {
    const { documentId, filePath, subjectId, title } = job.data;

    try {
      logger.info(`Processing PDF: ${documentId} - ${title}`);

      // Update status to processing
      await this.prisma.document.update({
        where: { id: documentId },
        data: { processingStatus: 'processing' },
      });

      // Step 1: Read PDF file (10%)
      await job.updateProgress(10);
      const fullPath = path.join(__dirname, '../../', filePath);
      const dataBuffer = await fs.readFile(fullPath);

      // Step 2: Parse PDF (30%)
      await job.updateProgress(30);
      const pdfData = await pdfParse(dataBuffer);
      const text = pdfData.text;
      const totalPages = pdfData.numpages;

      logger.info(`PDF parsed: ${totalPages} pages, ${text.length} characters`);

      // Step 3: Extract concepts with AI (50%)
      await job.updateProgress(50);
      const concepts = await this.extractConcepts(text, totalPages, subjectId);

      logger.info(`Extracted ${concepts.length} concepts from PDF`);

      // Step 4: Save concepts to database (80%)
      await job.updateProgress(80);
      for (const concept of concepts) {
        const created = await this.prisma.concept.create({
          data: {
            term: concept.term,
            definition: concept.definition,
            example: concept.example || null,
            pageNumber: concept.pageNumber || 1,
            documentId: documentId,
          },
        });
        concept.id = created.id;
      }

      const relationCandidates = this.relationDiscoveryService.detectRelations(
        concepts,
        this.chunkText(text, 2200)
      );

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

      await this.vectorSearchService.indexDocument({
        subjectId,
        documentId,
        rawText: text,
        concepts,
      });

      // Step 5: Update document status to completed (100%)
      await job.updateProgress(100);
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'completed',
          processingError: null,
        },
      });

      // Invalidate cache for this subject
      const cacheService = require('../services/cacheService');
      if (cacheService.enabled) {
        await cacheService.delByPattern(`*:subject:${subjectId}*`);
      }

      logger.info(`Successfully processed PDF: ${documentId}`);

      return {
        success: true,
        documentId,
        conceptsCount: concepts.length,
        pages: totalPages,
      };
    } catch (error) {
      logger.error(`Failed to process PDF ${documentId}:`, error);

      // Update document with error status
      await this.prisma.document.update({
        where: { id: documentId },
        data: {
          processingStatus: 'failed',
          processingError: error.message,
        },
      });

      throw error; // Re-throw for BullMQ retry mechanism
    }
  }

  /**
   * Extract concepts from PDF text using AI
   * @param {string} text - PDF text content
   * @param {number} totalPages - Total pages in PDF
   * @param {string} subjectId - Subject ID
   * @returns {Promise<Array>} - Array of concepts
   */
  async extractConcepts(text, totalPages, subjectId) {
    // Chunk text for better processing (max 4000 chars per chunk)
    const chunks = this.chunkText(text, 4000);
    const allConcepts = [];

    logger.info(`Processing ${chunks.length} chunks from PDF`);

    // Process chunks in batches
    const batchSize = 3; // Process 3 chunks at a time
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (chunk, idx) => {
        const chunkNum = i + idx + 1;
        const prompt = `Phân tích đoạn text sau và trích xuất các khái niệm quan trọng (concepts).
Trả về JSON array với format:
[
  {
    "term": "Tên khái niệm",
    "definition": "Định nghĩa ngắn gọn",
    "example": "Ví dụ minh họa (nếu có)",
    "pageNumber": ${Math.ceil((chunkNum / chunks.length) * totalPages)}
  }
]

Text:
${chunk.substring(0, 3000)}

Chỉ trả về JSON array, không giải thích thêm.`;

        try {
          const response = await this.aiService.ask(prompt);
          const concepts = this.parseConceptsFromAI(response);
          return concepts;
        } catch (error) {
          logger.error(`Failed to extract concepts from chunk ${chunkNum}:`, error);
          return [];
        }
      });

      const batchResults = await Promise.all(batchPromises);
      batchResults.forEach(concepts => {
        allConcepts.push(...concepts);
      });

      // Small delay to avoid rate limiting
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Deduplicate concepts by term (case-insensitive)
    const uniqueConcepts = this.deduplicateConcepts(allConcepts);

    return uniqueConcepts;
  }

  /**
   * Parse concepts from AI response
   * @param {string} response - AI response
   * @returns {Array} - Parsed concepts
   */
  parseConceptsFromAI(response) {
    try {
      // Try to extract JSON from response
      let jsonStr = response.trim();
      
      // Remove markdown code blocks if present
      jsonStr = jsonStr.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON array
      const match = jsonStr.match(/\[[\s\S]*\]/);
      if (match) {
        jsonStr = match[0];
      }

      const concepts = JSON.parse(jsonStr);
      
      // Validate and clean
      return concepts
        .filter(c => c.term && c.definition)
        .map(c => ({
          term: String(c.term).trim(),
          definition: String(c.definition).trim(),
          example: c.example ? String(c.example).trim() : null,
          pageNumber: c.pageNumber || 1,
        }));
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      return [];
    }
  }

  /**
   * Chunk text into smaller pieces
   * @param {string} text - Full text
   * @param {number} maxChunkSize - Max characters per chunk
   * @returns {Array<string>} - Array of text chunks
   */
  chunkText(text, maxChunkSize = 4000) {
    const chunks = [];
    const paragraphs = text.split(/\n\n+/);
    let currentChunk = '';

    for (const para of paragraphs) {
      if ((currentChunk + para).length <= maxChunkSize) {
        currentChunk += para + '\n\n';
      } else {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
        }
        currentChunk = para + '\n\n';
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk.trim());
    }

    return chunks.filter(c => c.length > 100); // Skip very small chunks
  }

  /**
   * Remove duplicate concepts
   * @param {Array} concepts - Array of concepts
   * @returns {Array} - Deduplicated concepts
   */
  deduplicateConcepts(concepts) {
    const seen = new Map();
    
    for (const concept of concepts) {
      const key = concept.term.toLowerCase();
      
      if (!seen.has(key)) {
        seen.set(key, concept);
      } else {
        // Keep the one with longer definition
        const existing = seen.get(key);
        if (concept.definition.length > existing.definition.length) {
          seen.set(key, concept);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Stop the worker
   */
  async stop() {
    if (this.worker) {
      await this.worker.close();
      logger.info('PDF Worker stopped');
    }
  }
}

module.exports = PdfWorker;

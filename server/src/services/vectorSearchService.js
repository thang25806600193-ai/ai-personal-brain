const crypto = require('crypto');
const logger = require('../utils/logger');

class VectorSearchService {
  constructor(prisma, aiService) {
    this.prisma = prisma;
    this.aiService = aiService;
    this.initialized = false;
    this.disabled = false;
  }

  async ensureSchema() {
    if (this.initialized || this.disabled) return;

    try {
      await this.prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS vector;');

      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SemanticEmbedding" (
          "id" TEXT PRIMARY KEY,
          "subjectId" TEXT NOT NULL,
          "documentId" TEXT,
          "conceptId" TEXT,
          "sourceType" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "contentHash" TEXT NOT NULL,
          "pageNumber" INTEGER,
          "embedding" vector(768) NOT NULL,
          "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          CONSTRAINT "SemanticEmbedding_subject_fkey"
            FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE,
          CONSTRAINT "SemanticEmbedding_document_fkey"
            FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE,
          CONSTRAINT "SemanticEmbedding_concept_fkey"
            FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE,
          CONSTRAINT "SemanticEmbedding_sourceType_check"
            CHECK ("sourceType" IN ('concept', 'chunk'))
        );
      `);

      await this.prisma.$executeRawUnsafe('CREATE UNIQUE INDEX IF NOT EXISTS "SemanticEmbedding_doc_type_hash_uq" ON "SemanticEmbedding" ("documentId", "sourceType", "contentHash");');
      await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SemanticEmbedding_subject_idx" ON "SemanticEmbedding" ("subjectId");');
      await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SemanticEmbedding_sourceType_idx" ON "SemanticEmbedding" ("sourceType");');
      await this.prisma.$executeRawUnsafe('CREATE INDEX IF NOT EXISTS "SemanticEmbedding_vector_idx" ON "SemanticEmbedding" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);');

      this.initialized = true;
      logger.info('✅ Vector search schema ready (pgvector)');
    } catch (error) {
      this.disabled = true;
      logger.error('Vector search disabled: could not initialize pgvector schema', error);
    }
  }

  _vectorLiteral(vector) {
    return `[${vector.map((v) => Number(v).toFixed(8)).join(',')}]`;
  }

  _hash(content) {
    return crypto.createHash('sha1').update(content).digest('hex');
  }

  _splitTextIntoChunks(text, targetChars = 1200, overlapChars = 180) {
    const content = String(text || '').trim();
    if (!content) return [];

    const chunks = [];
    let start = 0;

    while (start < content.length) {
      let end = Math.min(start + targetChars, content.length);
      if (end < content.length) {
        const nextBreak = content.lastIndexOf(' ', end);
        if (nextBreak > start + 200) {
          end = nextBreak;
        }
      }

      const piece = content.slice(start, end).trim();
      if (piece.length > 100) chunks.push(piece);

      if (end >= content.length) break;
      start = Math.max(end - overlapChars, start + 1);
    }

    return chunks;
  }

  async removeDocumentEmbeddings(documentId) {
    await this.ensureSchema();
    if (this.disabled) return;

    await this.prisma.$executeRawUnsafe('DELETE FROM "SemanticEmbedding" WHERE "documentId" = $1', documentId);
  }

  async indexDocument({ subjectId, documentId, pageTexts = [], rawText = '', concepts = [] }) {
    await this.ensureSchema();
    if (this.disabled) return;

    await this.removeDocumentEmbeddings(documentId);

    for (const concept of concepts) {
      const payload = `${concept.term || ''}. ${concept.definition || ''}. ${concept.example || ''}`.trim();
      if (!payload) continue;

      const vector = await this.aiService.embedText(payload);
      if (!vector) continue;

      const vectorLiteral = this._vectorLiteral(vector);
      const contentHash = this._hash(`concept:${concept.id}:${payload}`);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SemanticEmbedding"
          ("id", "subjectId", "documentId", "conceptId", "sourceType", "content", "contentHash", "pageNumber", "embedding")
         VALUES ($1, $2, $3, $4, 'concept', $5, $6, $7, $8::vector)
         ON CONFLICT ("documentId", "sourceType", "contentHash")
         DO UPDATE SET "content" = EXCLUDED."content", "embedding" = EXCLUDED."embedding", "pageNumber" = EXCLUDED."pageNumber"`,
        crypto.randomUUID(),
        subjectId,
        documentId,
        concept.id,
        payload,
        contentHash,
        concept.pageNumber || 1,
        vectorLiteral
      );
    }

    const chunksFromPages = pageTexts.length > 0
      ? pageTexts.flatMap((page, idx) => this._splitTextIntoChunks(page).map((piece) => ({ text: piece, pageNumber: idx + 1 })))
      : this._splitTextIntoChunks(rawText).map((piece) => ({ text: piece, pageNumber: null }));

    for (const chunk of chunksFromPages) {
      const vector = await this.aiService.embedText(chunk.text);
      if (!vector) continue;

      const vectorLiteral = this._vectorLiteral(vector);
      const contentHash = this._hash(`chunk:${chunk.pageNumber || 0}:${chunk.text}`);

      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "SemanticEmbedding"
          ("id", "subjectId", "documentId", "conceptId", "sourceType", "content", "contentHash", "pageNumber", "embedding")
         VALUES ($1, $2, $3, NULL, 'chunk', $4, $5, $6, $7::vector)
         ON CONFLICT ("documentId", "sourceType", "contentHash")
         DO UPDATE SET "content" = EXCLUDED."content", "embedding" = EXCLUDED."embedding", "pageNumber" = EXCLUDED."pageNumber"`,
        crypto.randomUUID(),
        subjectId,
        documentId,
        chunk.text,
        contentHash,
        chunk.pageNumber,
        vectorLiteral
      );
    }
  }

  async searchSimilar(subjectId, query, topK = 6) {
    await this.ensureSchema();
    if (this.disabled) return [];

    const vector = await this.aiService.embedText(query);
    if (!vector) return [];

    const vectorLiteral = this._vectorLiteral(vector);

    const rows = await this.prisma.$queryRawUnsafe(
      `SELECT se."id", se."sourceType", se."content", se."pageNumber", se."conceptId", se."documentId",
              d."title" AS "documentTitle",
              (1 - (se."embedding" <=> $2::vector)) AS similarity
       FROM "SemanticEmbedding" se
       LEFT JOIN "Document" d ON d."id" = se."documentId"
       WHERE se."subjectId" = $1
       ORDER BY se."embedding" <=> $2::vector
       LIMIT $3`,
      subjectId,
      vectorLiteral,
      topK
    );

    return rows.map((row) => ({
      ...row,
      similarity: Number(row.similarity || 0),
    }));
  }
}

module.exports = VectorSearchService;

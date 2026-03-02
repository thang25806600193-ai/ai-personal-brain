CREATE EXTENSION IF NOT EXISTS vector;

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

CREATE UNIQUE INDEX IF NOT EXISTS "SemanticEmbedding_doc_type_hash_uq"
  ON "SemanticEmbedding" ("documentId", "sourceType", "contentHash");

CREATE INDEX IF NOT EXISTS "SemanticEmbedding_subject_idx"
  ON "SemanticEmbedding" ("subjectId");

CREATE INDEX IF NOT EXISTS "SemanticEmbedding_sourceType_idx"
  ON "SemanticEmbedding" ("sourceType");

CREATE INDEX IF NOT EXISTS "SemanticEmbedding_vector_idx"
  ON "SemanticEmbedding" USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);

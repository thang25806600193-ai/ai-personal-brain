-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "conceptId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "aiSuggestion" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE INDEX "Suggestion_subjectId_status_idx" ON "Suggestion"("subjectId", "status");
CREATE INDEX "Suggestion_conceptId_idx" ON "Suggestion"("conceptId");

-- Foreign Keys
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_conceptId_fkey" FOREIGN KEY ("conceptId") REFERENCES "Concept"("id") ON DELETE CASCADE ON UPDATE CASCADE;

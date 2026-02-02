-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "emailVerifyTokenHash" TEXT,
    "emailVerifyTokenExpires" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER,
    "subjectId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Concept" (
    "id" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "definition" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "Concept_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relation" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "type" TEXT,

    CONSTRAINT "Relation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Concept" ADD CONSTRAINT "Concept_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Relation" ADD CONSTRAINT "Relation_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "Concept"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

/**
 * Document Routes
 * Refactored with DI Container and Input Validation
 */

const express = require('express');
const multer = require('multer');
const { validateDocumentUpload, validateDocumentId } = require('../middleware/validationMiddleware');

const createDocumentRoutes = (container) => {
  const router = express.Router();
  const documentController = container.getDocumentController();

  // Configure file storage with security
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      // Sanitize filename
      const sanitized = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
      cb(null, Date.now() + '-' + sanitized);
    },
  });

  // File upload security
  const upload = multer({
    storage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB max file size
      files: 1, // Only 1 file at a time
    },
    fileFilter: (req, file, cb) => {
      // Only allow PDF files
      if (file.mimetype === 'application/pdf') {
        cb(null, true);
      } else {
        cb(new Error('Only PDF files are allowed!'));
      }
    },
  });

  router.post('/upload', upload.single('pdfFile'), validateDocumentUpload, documentController.uploadDocument);
  router.delete('/:documentId', validateDocumentId, documentController.deleteDocument);

  return router;
};

module.exports = createDocumentRoutes;
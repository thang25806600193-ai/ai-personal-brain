const express = require('express');
const multer = require('multer');
const { uploadDocument } = require('../controllers/documentController');

const router = express.Router();

// Cấu hình nơi lưu file (thư mục 'uploads/')
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        // Đặt tên file: timestamp-ten-goc.pdf
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage });

// API Endpoint: POST /api/documents/upload
// upload.single('pdfFile'): Nhận 1 file từ field tên là 'pdfFile'
router.post('/upload', upload.single('pdfFile'), uploadDocument);

module.exports = router;
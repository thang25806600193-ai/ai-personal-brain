const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import hàm thông minh mới
const { askSmartAI, extractWithHF } = require('./services/aiService');
const documentRoutes = require('./routes/documentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use('/api/documents', documentRoutes);

app.get('/', (req, res) => {
  res.send('🚀 AI Personal Brain Server is running!');
});

// --- API TEST FALLBACK ---
app.post('/api/test-ai', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: "Cần gửi nội dung (message)" });
    }

    try {
        // 1. Chạy song song: Hugging Face trích xuất nền (không đợi)
        // Đây là kỹ thuật tối ưu: Fire-and-forget hoặc Promise.all nếu cần
        const hfPromise = extractWithHF(message);

        // 2. Gọi AI chính (Có cơ chế Gemini -> Groq)
        const answer = await askSmartAI(message);
        
        // Đợi Hugging Face xong (nếu cần hiển thị kết quả extraction)
        const summary = await hfPromise;

        res.json({
            input: message,
            ai_answer: answer,     // Câu trả lời từ Gemini hoặc Groq
            hf_summary: summary,   // Tóm tắt từ Hugging Face
            timestamp: new Date()
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
  console.log(`\n🔥 Server đang chạy tại: http://localhost:${PORT}`);
});
const fs = require('fs');
const { PdfDataParser } = require('pdf-data-parser'); // Thư viện mới
const { PrismaClient } = require('@prisma/client');
const { askSmartAI } = require('../services/aiService');

const prisma = new PrismaClient();

const uploadDocument = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ error: "Vui lòng upload file PDF" });

        const { originalname, path: filePath, size } = req.file;
        let { subjectId } = req.body; 
        console.log(`📂 Đang xử lý file thật: ${originalname}`);

        // --- 1. ĐỌC TEXT TỪ FILE PDF (Dùng thư viện mới) ---
        let fullText = "";
        let totalPages = 0;
        try {
            const parser = new PdfDataParser({ url: filePath });
            const rows = await parser.parse();
            // Nối các dòng lại thành văn bản
            fullText = rows.map(row => row.join(' ')).join('\n');
            
            // Ước lượng số trang (thư viện này không trả số trang chính xác, ta tạm tính)
            totalPages = Math.ceil(fullText.length / 3000) || 1; 
            console.log(`✅ Đã đọc được nội dung thực tế (${fullText.length} ký tự).`);
        } catch (readError) {
            console.error("❌ Lỗi đọc PDF:", readError);
            return res.status(500).json({ error: "Không thể đọc nội dung file PDF này." });
        }

        // --- 2. LOGIC TỰ ĐỘNG TẠO USER/SUBJECT (Giữ nguyên như cũ) ---
        const demoUserId = 'demo-user';
        let user = await prisma.user.findUnique({ where: { id: demoUserId } });
        if (!user) {
            await prisma.user.create({
                data: { id: demoUserId, email: 'auto_test@hutech.edu.vn', password: '123', name: 'Auto User' }
            });
        }
        if (!subjectId || subjectId === 'demo-subject') {
            const demoSubjectId = 'demo-subject';
            await prisma.subject.upsert({
                where: { id: demoSubjectId },
                update: {},
                create: { id: demoSubjectId, name: 'Môn học Demo', userId: demoUserId }
            });
            subjectId = demoSubjectId;
        }

        // --- 3. LƯU & GỌI AI ---
        const newDoc = await prisma.document.create({
            data: { title: originalname, filePath: filePath, fileSize: size, subjectId: subjectId }
        });

        console.log("🤖 Đang gửi nội dung thật cho AI phân tích...");
        // Giới hạn 4000 ký tự đầu để AI không bị quá tải (Free Tier)
        const prompt = `
            Dựa vào tài liệu học tập sau, hãy trích xuất 5-7 khái niệm quan trọng nhất (Nodes) và định nghĩa ngắn gọn.
            Trả về JSON CHUẨN dạng: [{"term": "Tên khái niệm", "definition": "Định nghĩa", "page": 1}]
            Tuyệt đối chỉ trả về JSON, không thêm lời dẫn.
            
            Văn bản: "${fullText.substring(0, 4000)}..."
        `;

        const aiResponse = await askSmartAI(prompt);
        
        let concepts = [];
        try {
            const cleanJson = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
            concepts = JSON.parse(cleanJson);

            for (const concept of concepts) {
                await prisma.concept.create({
                    data: {
                        term: concept.term,
                        definition: concept.definition,
                        pageNumber: concept.page || 1, 
                        documentId: newDoc.id
                    }
                });
            }
        } catch (e) {
            console.error("⚠️ Lỗi đọc JSON từ AI:", e);
        }

        res.json({
            message: "Xử lý thành công!",
            document: newDoc,
            extractedConcepts: concepts,
            totalPages: totalPages
        });

    } catch (error) {
        console.error("❌ Lỗi Server:", error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = { uploadDocument };
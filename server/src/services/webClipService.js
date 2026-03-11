const ValidationException = require('../exceptions/ValidationException');
const { getPrismaClient } = require('../config/database');
const queueService = require('./queueService');

class WebClipService {
  constructor() {
    this.prisma = getPrismaClient();
  }

  async enqueueClip({ text, source_url, source_title, subject_id }, userId) {
    const cleanText = String(text || '').trim();
    const cleanSourceUrl = String(source_url || '').trim();
    const cleanSourceTitle = String(source_title || '').trim();
    const subjectId = String(subject_id || '').trim();

    if (!cleanText || cleanText.length < 20) {
      throw new ValidationException('Noi dung boi den qua ngan (toi thieu 20 ky tu)', 'text');
    }

    if (!subjectId) {
      throw new ValidationException('subject_id la bat buoc', 'subject_id');
    }

    const subject = await this.prisma.subject.findFirst({
      where: {
        id: subjectId,
        userId,
      },
      select: { id: true },
    });

    if (!subject) {
      throw new ValidationException('Khong tim thay mon hoc hoac ban khong co quyen', 'subject_id');
    }

    const job = await queueService.addWebClipProcessingJob({
      userId,
      subjectId,
      text: cleanText.slice(0, 20000),
      sourceUrl: cleanSourceUrl,
      sourceTitle: cleanSourceTitle || 'Web Clip',
    });

    return {
      message: 'Clip da duoc dua vao hang doi xu ly',
      job,
    };
  }
}

module.exports = WebClipService;

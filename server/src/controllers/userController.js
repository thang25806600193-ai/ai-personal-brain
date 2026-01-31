const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const prisma = new PrismaClient();

const getMe = async (req, res) => {
  try {
    const userId = req.user.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true }
    });

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error('Lỗi getMe:', error);
    res.status(500).json({ error: 'Lỗi server khi lấy thông tin người dùng' });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { name, email, avatarUrl } = req.body;

    if (!name && !email && !avatarUrl) {
      return res.status(400).json({ error: 'Không có dữ liệu để cập nhật' });
    }

    if (email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== userId) {
        return res.status(400).json({ error: 'Email đã được sử dụng' });
      }
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(email !== undefined ? { email } : {}),
        ...(avatarUrl !== undefined ? { avatarUrl } : {})
      },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Lỗi updateProfile:', error);
    res.status(500).json({ error: 'Lỗi server khi cập nhật hồ sơ' });
  }
};

const updatePassword = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Thiếu mật khẩu hiện tại hoặc mật khẩu mới' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Mật khẩu hiện tại không đúng' });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    res.json({ message: 'Đổi mật khẩu thành công' });
  } catch (error) {
    console.error('Lỗi updatePassword:', error);
    res.status(500).json({ error: 'Lỗi server khi đổi mật khẩu' });
  }
};

const updateAvatar = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!req.file) return res.status(400).json({ error: 'Không có file avatar' });

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_CLOUD_NAME) {
      return res.status(500).json({ error: 'Thiếu cấu hình Cloudinary. Vui lòng kiểm tra .env' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'ai-personal-brain/avatars',
          resource_type: 'image',
          transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }]
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploadResult.secure_url },
      select: { id: true, name: true, email: true, avatarUrl: true, createdAt: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Lỗi updateAvatar:', error);
    res.status(500).json({ error: 'Lỗi server khi cập nhật avatar' });
  }
};

module.exports = { getMe, updateProfile, updatePassword, updateAvatar };

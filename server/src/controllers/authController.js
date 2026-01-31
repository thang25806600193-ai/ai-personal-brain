const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const { sendVerificationEmail } = require('../services/emailService');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_change_this_in_production';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:5173';

// 1. Đăng ký
const register = async (req, res) => {
    try {
        const { email, password, name } = req.body;

        // Kiểm tra email trùng
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) return res.status(400).json({ error: "Email này đã được sử dụng!" });

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Tạo token xác thực email
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 1000 * 60 * 60); // 1 giờ

        // Tạo user mới
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPassword,
                name,
                emailVerified: false,
                emailVerifyTokenHash: tokenHash,
                emailVerifyTokenExpires: tokenExpires
            }
        });

        const verifyUrl = `${APP_BASE_URL}/verify-email?token=${rawToken}`;
        await sendVerificationEmail({ to: email, name, verifyUrl });

        res.json({ message: "Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản." });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server khi đăng ký." });
    }
};

// 2. Đăng nhập
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Tìm user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(400).json({ error: "Email hoặc mật khẩu không đúng." });

        if (!user.emailVerified) {
            return res.status(403).json({ error: "Vui lòng xác thực email trước khi đăng nhập." });
        }

        // So sánh mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ error: "Email hoặc mật khẩu không đúng." });

        // Tạo Token (Vé vào cửa)
        const token = jwt.sign({ userId: user.id, name: user.name }, JWT_SECRET, { expiresIn: '7d' });

        res.json({ 
            message: "Đăng nhập thành công!", 
            token, 
            user: { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl || null } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Lỗi server khi đăng nhập." });
    }
};

// 3. Xác thực email
const verifyEmail = async (req, res) => {
    try {
        const { token } = req.query;
        if (!token) return res.status(400).json({ error: 'Thiếu token' });

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const user = await prisma.user.findFirst({
            where: {
                emailVerifyTokenHash: tokenHash,
                emailVerifyTokenExpires: { gt: new Date() }
            }
        });

        if (!user) {
            return res.json({ message: 'Đã xác thực trước đó hoặc token không hợp lệ.' });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerified: true,
                emailVerifyTokenHash: null,
                emailVerifyTokenExpires: null
            }
        });

        res.json({ message: 'Xác thực email thành công! Bạn có thể đăng nhập.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi server khi xác thực email.' });
    }
};

// 4. Gửi lại email xác thực
const resendVerifyEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Thiếu email' });

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) return res.status(404).json({ error: 'Không tìm thấy người dùng' });
        if (user.emailVerified) return res.status(400).json({ error: 'Email đã được xác thực' });

        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const tokenExpires = new Date(Date.now() + 1000 * 60 * 60);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                emailVerifyTokenHash: tokenHash,
                emailVerifyTokenExpires: tokenExpires
            }
        });

        const verifyUrl = `${APP_BASE_URL}/verify-email?token=${rawToken}`;
        await sendVerificationEmail({ to: email, name: user.name, verifyUrl });

        res.json({ message: 'Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Lỗi server khi gửi lại email xác thực.' });
    }
};

module.exports = { register, login, verifyEmail, resendVerifyEmail };
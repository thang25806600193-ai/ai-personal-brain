const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

const sendVerificationEmail = async ({ to, name, verifyUrl }) => {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const subject = 'Xác thực email tài khoản AI Personal Brain';
  const displayName = name || 'bạn';
  const html = `
  <div style="background:#0f172a;padding:32px;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#0b1220;border:1px solid #1f2937;border-radius:16px;overflow:hidden;">
      <div style="padding:24px 24px 0;display:flex;align-items:center;gap:12px;">
        <div style="width:40px;height:40px;border-radius:10px;background:#2563eb;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;">AI</div>
        <div style="color:#e2e8f0;font-size:18px;font-weight:700;">AI Personal Brain</div>
      </div>

      <div style="padding:24px;color:#e2e8f0;line-height:1.7;">
        <h2 style="margin:0 0 12px;font-size:20px;">Xin chào ${displayName},</h2>
        <p style="margin:0 0 16px;color:#cbd5e1;">Cảm ơn bạn đã đăng ký. Vui lòng xác thực email để kích hoạt tài khoản.</p>

        <div style="text-align:center;margin:24px 0;">
          <a href="${verifyUrl}" style="background:#2563eb;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;display:inline-block;font-weight:700;">
            Xác thực email
          </a>
        </div>

        <div style="background:#0f172a;border:1px solid #1f2937;border-radius:10px;padding:12px 14px;color:#94a3b8;font-size:12px;">
          Nếu nút không hoạt động, hãy mở link này trong trình duyệt:<br />
          <a href="${verifyUrl}" style="color:#60a5fa;word-break:break-all;">${verifyUrl}</a>
        </div>

        <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">Nếu bạn không đăng ký tài khoản này, hãy bỏ qua email này.</p>
      </div>

      <div style="padding:16px 24px;border-top:1px solid #1f2937;color:#64748b;font-size:12px;">
        © 2026 AI Personal Brain. Nền tảng quản lý tri thức cá nhân.
      </div>
    </div>
  </div>
  `;

  await transporter.sendMail({ from, to, subject, html });
};

module.exports = { sendVerificationEmail };

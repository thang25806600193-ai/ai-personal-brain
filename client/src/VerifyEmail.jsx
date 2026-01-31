import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react';

export default function VerifyEmail() {
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('Đang xác thực email...');
  const [email, setEmail] = useState('');
  const [resendMessage, setResendMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const hasVerifiedRef = useRef(false);

  useEffect(() => {
    if (hasVerifiedRef.current) return;
    hasVerifiedRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage('Thiếu token xác thực.');
      return;
    }

    const verify = async () => {
      try {
        const res = await axios.get(`http://localhost:5000/api/auth/verify-email?token=${token}`);
        setStatus('success');
        setMessage(res.data.message || 'Xác thực email thành công!');
      } catch (error) {
        if (status !== 'success') {
          setStatus('error');
          setMessage(error?.response?.data?.error || 'Xác thực thất bại hoặc token đã hết hạn.');
        }
      }
    };

    verify();
  }, []);

  const handleResend = async () => {
    if (!email.trim()) {
      setResendMessage('Vui lòng nhập email.');
      return;
    }

    try {
      setResendLoading(true);
      setResendMessage('');
      const res = await axios.post('http://localhost:5000/api/auth/resend-verify', { email });
      setResendMessage(res.data.message || 'Đã gửi lại email xác thực.');
    } catch (error) {
      setResendMessage(error?.response?.data?.error || 'Không thể gửi lại email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e293b] text-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg bg-slate-900/80 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center">
          {status === 'loading' && (
            <div className="text-blue-400 flex items-center justify-center gap-2">
              <RefreshCw className="animate-spin" size={20} />
              <span>Đang xác thực...</span>
            </div>
          )}
          {status === 'success' && (
            <div className="text-green-400 flex items-center justify-center gap-2">
              <CheckCircle size={20} />
              <span>Xác thực thành công</span>
            </div>
          )}
          {status === 'error' && (
            <div className="text-red-400 flex items-center justify-center gap-2">
              <XCircle size={20} />
              <span>Xác thực thất bại</span>
            </div>
          )}

          <p className="mt-4 text-slate-300 text-sm">{message}</p>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            Quay lại đăng nhập
          </button>
        </div>
      </div>
    </div>
  );
}

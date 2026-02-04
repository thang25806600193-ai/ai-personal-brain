import React, { useState, useEffect } from 'react';
import { Copy, CheckCircle, Loader2, X, Globe, Lock, Mail, Trash2, Users } from 'lucide-react';

export default function ShareModal({ isOpen, selectedSubject, onClose }) {
  const [activeTab, setActiveTab] = useState('link'); // 'link' or 'email'
  const [shareType, setShareType] = useState('public');
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [existingShare, setExistingShare] = useState(null);
  
  // Email sharing states
  const [email, setEmail] = useState('');
  const [sharedUsers, setSharedUsers] = useState([]);
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  useEffect(() => {
    if (isOpen && selectedSubject?.id) {
      loadExistingShare();
      if (activeTab === 'email') {
        loadSharedUsers();
      }
    } else if (!isOpen) {
      setShareLink('');
      setCopied(false);
      setError('');
      setExistingShare(null);
      setEmail('');
      setSharedUsers([]);
      setEmailError('');
      setEmailSuccess('');
      setActiveTab('link');
    }
  }, [isOpen, selectedSubject?.id, activeTab]);

  const loadExistingShare = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/subjects/${selectedSubject.id}/share`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setExistingShare(data);
        setShareType(data.shareType);
        const fullLink = `${window.location.origin}/share/${data.token}`;
        setShareLink(fullLink);
      }
    } catch (err) {
      // Chưa có share, bỏ qua
    }
  };

  const handleShare = async () => {
    if (!selectedSubject?.id) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/shares/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          subjectId: selectedSubject.id,
          shareType,
        }),
      });

      if (!response.ok) {
        throw new Error('Không thể tạo link chia sẻ');
      }

      const data = await response.json();
      // Use window.location.origin instead of hardcoding domain
      const fullLink = `${window.location.origin}/share/${data.token}`;
      setShareLink(fullLink);
    } catch (err) {
      setError(err.message || 'Lỗi khi tạo link chia sẻ');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const loadSharedUsers = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/shares/${selectedSubject.id}/users`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSharedUsers(data);
      }
    } catch (err) {
      console.error('Failed to load shared users:', err);
    }
  };

  const handleShareWithEmail = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setEmailLoading(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      const response = await fetch('http://localhost:5000/api/shares/email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          subjectId: selectedSubject.id,
          email: email.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Không thể chia sẻ');
      }

      setEmailSuccess(data.message);
      setEmail('');
      loadSharedUsers();
    } catch (err) {
      setEmailError(err.message || 'Lỗi khi chia sẻ');
    } finally {
      setEmailLoading(false);
    }
  };

  const handleRemoveUser = async (userId) => {
    if (!confirm('Xóa quyền truy cập của người này?')) return;

    try {
      const response = await fetch(`http://localhost:5000/api/shares/${selectedSubject.id}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        loadSharedUsers();
      }
    } catch (err) {
      console.error('Failed to remove user:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Chia sẻ: {selectedSubject?.name}</h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition"
          >
            <X size={24} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Tab Switcher */}
          <div className="flex gap-2 p-1 bg-slate-800/50 rounded-lg">
            <button
              onClick={() => setActiveTab('link')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'link'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe size={16} />
              Link công khai
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold transition ${
                activeTab === 'email'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Mail size={16} />
              Chia sẻ theo email
            </button>
          </div>

          {/* Link Sharing Tab */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* Share Type Selection */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-slate-300">Loại chia sẻ:</p>

                {/* Public Option */}
                <label className="flex items-start gap-3 p-3 border border-slate-700 rounded-lg hover:border-blue-500 hover:bg-slate-800/50 cursor-pointer transition">
                  <input
                    type="radio"
                    name="shareType"
                    value="public"
                    checked={shareType === 'public'}
                    onChange={(e) => setShareType(e.target.value)}
                    className="mt-1 accent-blue-500"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <Globe size={16} className="text-blue-400" />
                      Công khai
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Ai có link đều có thể xem (chỉ đọc)
                    </p>
                  </div>
                </label>

                {/* Private Option */}
                <label className="flex items-start gap-3 p-3 border border-slate-700 rounded-lg hover:border-purple-500 hover:bg-slate-800/50 cursor-pointer transition">
                  <input
                    type="radio"
                    name="shareType"
                    value="private"
                    checked={shareType === 'private'}
                    onChange={(e) => setShareType(e.target.value)}
                    className="mt-1 accent-purple-500"
                  />
                  <div>
                    <div className="flex items-center gap-2 font-semibold text-white">
                      <Lock size={16} className="text-purple-400" />
                      Riêng tư
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                      Chỉ bạn và người được thêm có thể xem
                    </p>
                  </div>
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Share Link Display */}
              {shareLink && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-300">Link chia sẻ:</p>
                  <div className="flex gap-2 items-center bg-slate-800/50 border border-slate-700 rounded-lg p-3">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-transparent text-blue-400 text-sm truncate outline-none"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-semibold transition-all ${
                        copied
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-white hover:bg-slate-600'
                      }`}
                    >
                      {copied ? (
                        <>
                          <CheckCircle size={16} />
                          Đã copy
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
                >
                  Đóng
                </button>
                <button
                  onClick={handleShare}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      {existingShare ? 'Đang lưu...' : 'Đang tạo...'}
                    </>
                  ) : (
                    existingShare ? 'Lưu thay đổi' : 'Tạo link chia sẻ'
                  )}
                </button>
              </div>

              {/* Info Text */}
              <p className="text-xs text-slate-500 text-center mt-4">
                Link chia sẻ cho phép người khác xem kiến thức của bạn (không thể chỉnh sửa)
              </p>
            </div>
          )}

          {/* Email Sharing Tab */}
          {activeTab === 'email' && (
            <div className="space-y-4">
              {/* Email Input Form */}
              <form onSubmit={handleShareWithEmail} className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-slate-300 mb-2">
                    Nhập email người nhận:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@gmail.com"
                      className="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={emailLoading || !email.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg font-semibold transition flex items-center gap-2"
                    >
                      {emailLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          <Mail size={16} />
                          Thêm
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Email Error/Success Messages */}
                {emailError && (
                  <div className="p-3 bg-red-900/20 border border-red-700 rounded-lg text-red-400 text-sm">
                    {emailError}
                  </div>
                )}
                {emailSuccess && (
                  <div className="p-3 bg-green-900/20 border border-green-700 rounded-lg text-green-400 text-sm">
                    {emailSuccess}
                  </div>
                )}
              </form>

              {/* Shared Users List */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                  <Users size={16} />
                  Người có quyền truy cập ({sharedUsers.length})
                </div>
                
                {sharedUsers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Chưa chia sẻ với ai
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {sharedUsers.map((share) => (
                      <div
                        key={share.id}
                        className="flex items-center justify-between p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold">
                            {share.user.name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{share.user.name || 'Người dùng'}</p>
                            <p className="text-xs text-slate-400">{share.user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveUser(share.userId)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition"
                          title="Xóa quyền truy cập"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Close Button */}
              <button
                onClick={onClose}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition"
              >
                Đóng
              </button>

              {/* Info Text */}
              <p className="text-xs text-slate-500 text-center">
                Chỉ người đã đăng ký tài khoản mới có thể được chia sẻ
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

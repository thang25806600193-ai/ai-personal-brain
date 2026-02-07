import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart3, BookOpen, BrainCircuit, FileText, Layers, LogOut, User, Camera, X, Lock, UserPlus } from 'lucide-react';
import { API_URL, toAbsoluteUrl } from '../config/api';

export default function Dashboard({ user, onLogout, onReturnToApp, onUserUpdate }) {
  const [subjects, setSubjects] = useState([]);
  const [sharedSubjects, setSharedSubjects] = useState([]);
  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalDocuments: 0,
    totalConcepts: 0
  });
  const [loading, setLoading] = useState(true);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profile, setProfile] = useState({ name: '', email: '', avatarUrl: '' });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);

  const token = localStorage.getItem('token');
  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` }
  });

  const getAvatarSrc = (avatarUrl) => toAbsoluteUrl(avatarUrl);

  const handleAuthExpired = (error) => {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      localStorage.clear();
      onLogout();
    }
  };

  useEffect(() => {
    loadDashboardData();
    loadSharedWithMe();
  }, []);

  useEffect(() => {
    if (isProfileOpen) {
      loadProfile();
    }
  }, [isProfileOpen]);

  const loadProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError('');
      const res = await api.get('/users/me');
      setProfile({
        name: res.data.name || '',
        email: res.data.email || '',
        avatarUrl: res.data.avatarUrl || ''
      });
    } catch (error) {
      handleAuthExpired(error);
      setProfileError('Không thể tải thông tin hồ sơ');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setProfileLoading(true);
      setProfileError('');
      const res = await api.put('/users/me', {
        name: profile.name,
        email: profile.email
      });

      const updatedUser = { ...user, ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUserUpdate?.(updatedUser);
    } catch (error) {
      handleAuthExpired(error);
      setProfileError(error?.response?.data?.error || 'Cập nhật hồ sơ thất bại');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setPasswordMessage('');
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        setPasswordMessage('Mật khẩu mới không khớp');
        return;
      }
      await api.put('/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });
      setPasswordMessage('Đổi mật khẩu thành công');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      handleAuthExpired(error);
      setPasswordMessage(error?.response?.data?.error || 'Đổi mật khẩu thất bại');
    }
  };

  const handleUploadAvatar = async (file) => {
    try {
      setAvatarUploading(true);
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const updatedUser = { ...user, ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      onUserUpdate?.(updatedUser);
      setProfile(prev => ({ ...prev, avatarUrl: res.data.avatarUrl }));
    } catch (error) {
      handleAuthExpired(error);
      setProfileError(error?.response?.data?.error || 'Cập nhật avatar thất bại');
    } finally {
      setAvatarUploading(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const subjectsRes = await api.get('/subjects');
      setSubjects(subjectsRes.data);

      let totalDocs = 0;
      let totalConcepts = 0;

      for (const subject of subjectsRes.data) {
        totalDocs += subject._count?.documents || 0;

        try {
          const graphRes = await api.get(`/subjects/${subject.id}/graph`);
          totalConcepts += graphRes.data.nodes.filter(n => n.type === 'Concept').length;
        } catch (e) {
          console.error("Lỗi load graph:", e);
        }
      }

      setStats({
        totalSubjects: subjectsRes.data.length,
        totalDocuments: totalDocs,
        totalConcepts: totalConcepts
      });
    } catch (error) {
      handleAuthExpired(error);
      console.error("Lỗi load dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadSharedWithMe = async () => {
    try {
      const response = await api.get('/shares/shared-with-me');
      setSharedSubjects(response.data);
    } catch (error) {
      handleAuthExpired(error);
      console.error("Lỗi load shared subjects:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#020617]">
        <div className="text-white text-center">
          <BrainCircuit size={48} className="mx-auto mb-4 animate-pulse" />
          <p>Đang tải...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e293b] text-white overflow-y-auto">
      <header className="bg-slate-900/80 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BrainCircuit size={28} />
            </div>
            <h1 className="text-2xl font-bold">My Brain Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg hover:bg-slate-700 transition"
            >
              {user?.avatarUrl ? (
                <img
                  src={getAvatarSrc(user.avatarUrl)}
                  alt="avatar"
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <User size={18} className="text-blue-400" />
              )}
              <span className="text-sm">{user?.name || 'Người dùng'}</span>
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-2 text-red-400 hover:text-red-300 px-4 py-2 rounded-lg hover:bg-red-900/20 transition"
            >
              <LogOut size={18} />
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-900/20 border border-blue-500/30 rounded-2xl p-6 hover:shadow-lg hover:shadow-blue-500/20 transition">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-blue-400 text-sm font-bold uppercase tracking-wider mb-1">Môn học</p>
                <h3 className="text-4xl font-black text-white">{stats.totalSubjects}</h3>
              </div>
              <div className="bg-blue-600/30 p-3 rounded-lg">
                <BookOpen size={32} className="text-blue-400" />
              </div>
            </div>
            <p className="text-blue-300/70 text-sm">Tổng số môn học đang quản lý</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-900/20 border border-purple-500/30 rounded-2xl p-6 hover:shadow-lg hover:shadow-purple-500/20 transition">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-purple-400 text-sm font-bold uppercase tracking-wider mb-1">Tài liệu</p>
                <h3 className="text-4xl font-black text-white">{stats.totalDocuments}</h3>
              </div>
              <div className="bg-purple-600/30 p-3 rounded-lg">
                <FileText size={32} className="text-purple-400" />
              </div>
            </div>
            <p className="text-purple-300/70 text-sm">Tổng số tài liệu đã upload</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600/20 to-emerald-900/20 border border-emerald-500/30 rounded-2xl p-6 hover:shadow-lg hover:shadow-emerald-500/20 transition">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-emerald-400 text-sm font-bold uppercase tracking-wider mb-1">Khái niệm</p>
                <h3 className="text-4xl font-black text-white">{stats.totalConcepts}</h3>
              </div>
              <div className="bg-emerald-600/30 p-3 rounded-lg">
                <Layers size={32} className="text-emerald-400" />
              </div>
            </div>
            <p className="text-emerald-300/70 text-sm">Tổng số khái niệm được trích xuất</p>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <BarChart3 className="text-blue-400" />
            Danh sách môn học
          </h2>

          {subjects.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen size={48} className="mx-auto mb-4 text-slate-500 opacity-50" />
              <p className="text-slate-400">Chưa có môn học nào. Hãy tạo môn học mới!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {subjects.map(subject => (
                <div
                  key={subject.id}
                  onClick={() => onReturnToApp(subject)}
                  className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700 hover:border-blue-500/50 rounded-xl p-4 transition group cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 
                      className="font-bold text-white group-hover:text-blue-400 transition truncate"
                    >
                      {subject.name}
                    </h3>
                    <span className="bg-blue-600/30 text-blue-300 text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2">
                      {subject._count?.documents || 0} file
                    </span>
                  </div>
                  <p className="text-slate-400 text-sm mb-3">
                    Được tạo: {new Date(subject.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Shared With Me Section - Simplified */}
        {sharedSubjects.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 backdrop-blur-sm mb-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
              <UserPlus className="text-purple-400" />
              Tri thức được chia sẻ với bạn
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedSubjects.map(share => (
                <div
                  key={share.id}
                  onClick={() => onReturnToApp(share)}
                  className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 hover:from-purple-900/40 hover:to-purple-600/20 border border-purple-700/50 hover:border-purple-500 rounded-xl p-4 transition cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-bold text-white group-hover:text-purple-300 transition truncate">
                      {share.subject.name}
                    </h3>
                    <span className="bg-purple-600/30 text-purple-300 text-xs px-2 py-1 rounded-full flex-shrink-0 ml-2">
                      Chỉ xem
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
                    <User size={14} />
                    <span>Được chia sẻ bởi: {share.subject.user.name || share.subject.user.email}</span>
                  </div>
                  <p className="text-slate-500 text-xs">
                    {new Date(share.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-12 grid grid-cols-1 gap-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-8 text-center hover:border-blue-500/50 transition cursor-pointer group">
            <div className="bg-blue-600/20 w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-600/40 transition">
              <BookOpen size={32} className="text-blue-400" />
            </div>
            <h3 className="font-bold mb-2">Quản lý môn học</h3>
            <p className="text-slate-400 text-sm mb-4">Tìm kiếm, tạo hoặc sửa môn học</p>
            <button
              onClick={onReturnToApp}
              className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg font-bold transition text-sm w-full"
            >
              Quay lại ứng dụng
            </button>
          </div>
        </div>
      </main>

      {isProfileOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Hồ sơ người dùng</h2>
              <button onClick={() => setIsProfileOpen(false)} className="hover:bg-slate-800 p-2 rounded-lg">
                <X size={18} />
              </button>
            </div>

            {profileLoading ? (
              <div className="text-slate-300">Đang tải...</div>
            ) : (
              <div className="space-y-6">
                {profileError && (
                  <div className="text-red-400 bg-red-900/20 border border-red-600/30 rounded-lg px-3 py-2 text-sm">
                    {profileError}
                  </div>
                )}

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden flex items-center justify-center">
                    {profile.avatarUrl ? (
                      <img
                        src={getAvatarSrc(profile.avatarUrl)}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={24} className="text-slate-400" />
                    )}
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-3 py-2 rounded-lg text-sm">
                    <Camera size={16} />
                    {avatarUploading ? 'Đang tải...' : 'Đổi avatar'}
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handleUploadAvatar(e.target.files[0])}
                      disabled={avatarUploading}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400">Tên hiển thị</label>
                    <input
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={profile.name}
                      onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Email</label>
                    <input
                      className="w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      value={profile.email}
                      onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateProfile}
                    className="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold"
                    disabled={profileLoading}
                  >
                    Lưu thay đổi
                  </button>
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <h3 className="text-sm font-bold flex items-center gap-2 mb-3"><Lock size={14} /> Đổi mật khẩu</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                      type="password"
                      placeholder="Mật khẩu hiện tại"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    />
                    <input
                      type="password"
                      placeholder="Mật khẩu mới"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    />
                    <input
                      type="password"
                      placeholder="Nhập lại"
                      className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    />
                  </div>
                  {passwordMessage && (
                    <p className={`text-sm mt-2 ${passwordMessage.includes('thành công') ? 'text-green-400' : 'text-red-400'}`}>
                      {passwordMessage}
                    </p>
                  )}
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleChangePassword}
                      className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-bold"
                    >
                      Cập nhật mật khẩu
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-slate-800 mt-20 py-8 px-6 text-center text-slate-400 text-sm">
        <p>© 2026 AI Personal Brain. Nền tảng quản lý tri thức cá nhân.</p>
      </footer>
    </div>
  );
}
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BrainCircuit, Lock, Mail, User, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import azdigi from './assets/azdigi.png';

const AuthPage = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '' });
  const [error, setError] = useState('');
  const [nodes, setNodes] = useState([]);
  const [emailSent, setEmailSent] = useState(false);

  useEffect(() => {
    // Tạo các node ngẫu nhiên
    const generateNodes = () => {
      const newNodes = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 2,
      }));
      setNodes(newNodes);
    };
    generateNodes();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/login' : '/register';
      const res = await axios.post(`http://localhost:5000/api/auth${endpoint}`, formData);

      if (isLogin) {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        onLoginSuccess(res.data.user);
      } else {
        // Giả sử bạn đã gửi email xác thực thành công
        setEmailSent(true);
        alert("Đăng ký thành công! Vui lòng kiểm tra hộp thư của bạn để xác thực.");
        setIsLogin(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  };

  const styles = `
    @keyframes gradient-shift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-15px); }
    }

    @keyframes pulse-glow {
      0%, 100% { 
        box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
      }
      50% { 
        box-shadow: 0 0 30px rgba(59, 130, 246, 0.5);
      }
    }

    @keyframes node-pulse {
      0%, 100% { r: 3px; opacity: 0.6; }
      50% { r: 5px; opacity: 1; }
    }

    @keyframes link-draw {
      0% { stroke-dashoffset: 1000; }
      100% { stroke-dashoffset: 0; }
    }

    @keyframes particle-flow {
      0% { 
        cx: attr(data-x1);
        cy: attr(data-y1);
        opacity: 1;
      }
      100% { 
        cx: attr(data-x2);
        cy: attr(data-y2);
        opacity: 0;
      }
    }

    .animated-bg {
      background: linear-gradient(-45deg, #020617, #0f172a, #1e293b, #334155);
      background-size: 400% 400%;
      animation: gradient-shift 15s ease infinite;
    }

    .float { animation: float 6s ease-in-out infinite; }

    .pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }

    .network-canvas {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      opacity: 0.4;
      z-index: 0;
    }

    .node {
      animation: node-pulse 3s ease-in-out infinite;
    }

    .link {
      stroke: url(#gradient-link);
      stroke-width: 0.5;
      fill: none;
      opacity: 0.5;
      filter: drop-shadow(0 0 2px rgba(59, 130, 246, 0.3));
    }

    .node-circle {
      fill: url(#gradient-node);
      filter: drop-shadow(0 0 3px rgba(59, 130, 246, 0.5));
    }

    .slide-in-left { 
      animation: slide-in-left 0.8s ease-out forwards;
    }

    @keyframes slide-in-left {
      0% { opacity: 0; transform: translateX(-50px); }
      100% { opacity: 1; transform: translateX(0); }
    }

    .slide-in-right { 
      animation: slide-in-right 0.8s ease-out forwards;
    }

    @keyframes slide-in-right {
      0% { opacity: 0; transform: translateX(50px); }
      100% { opacity: 1; transform: translateX(0); }
    }

    .hover-lift {
      transition: all 0.3s ease;
    }

    .hover-lift:hover {
      transform: translateY(-5px);
      box-shadow: 0 10px 25px rgba(59, 130, 246, 0.2);
    }

    .input-glow {
      transition: all 0.3s ease;
    }

    .input-glow:focus {
      box-shadow: 0 0 15px rgba(59, 130, 246, 0.5), inset 0 0 5px rgba(59, 130, 246, 0.1);
    }

    .button-hover {
      position: relative;
      overflow: hidden;
    }

    .button-hover::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      transition: left 0.5s;
    }

    .button-hover:hover::before {
      left: 100%;
    }

    .feature-card {
      animation: feature-appear 0.6s ease-out forwards;
    }

    .feature-card:nth-child(1) { animation-delay: 0.1s; }
    .feature-card:nth-child(2) { animation-delay: 0.2s; }
    .feature-card:nth-child(3) { animation-delay: 0.3s; }
    .feature-card:nth-child(4) { animation-delay: 0.4s; }

    @keyframes feature-appear {
      0% { opacity: 0; transform: scale(0.9); }
      100% { opacity: 1; transform: scale(1); }
    }
  `;

  return (
    <>
      <style>{styles}</style>
      <div className="flex h-screen w-full animated-bg font-sans overflow-hidden relative">
        {/* Network Background SVG */}
        <svg className="network-canvas" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="gradient-link" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(59, 130, 246, 0.5)" />
              <stop offset="100%" stopColor="rgba(147, 51, 234, 0.3)" />
            </linearGradient>
            <linearGradient id="gradient-node" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#9333ea" />
            </linearGradient>
          </defs>

          {/* Links - đường kết nối */}
          {nodes.map((node, i) => {
            const nextNode = nodes[(i + 1) % nodes.length];
            return (
              <line
                key={`link-${i}`}
                x1={node.x}
                y1={node.y}
                x2={nextNode.x}
                y2={nextNode.y}
                className="link"
                strokeDasharray="10"
                style={{
                  animation: `link-draw ${3 + i * 0.5}s ease-in-out infinite`,
                }}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node, i) => (
            <circle
              key={`node-${i}`}
              cx={node.x}
              cy={node.y}
              r={node.size}
              className="node-circle node"
            />
          ))}
        </svg>

        {/* Animated Background Orbs */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[100px] float"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[100px] float" style={{ animationDelay: '2s' }}></div>

        {/* Left Side - Giới thiệu */}
        <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 relative z-10">
          {/* Logo & Branding */}
          <div className="slide-in-left">
            <div className="inline-flex items-center justify-center p-3 bg-blue-600/20 rounded-xl mb-6 backdrop-blur-sm border border-blue-500/30 pulse-glow">
              <BrainCircuit className="w-10 h-10 text-blue-500" />
            </div>
            <h1 className="text-5xl font-black text-white mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
              AI Personal Brain
            </h1>
            <p className="text-lg text-slate-300 mb-8">
              Nền tảng quản lý tri thức cá nhân bằng AI
            </p>
          </div>

          {/* Main Content */}
          <div className="space-y-8">
            {/* About Project */}
            <div className="feature-card bg-slate-900/40 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-6 hover:border-blue-500/50 transition-all hover-lift">
              <div className="flex items-start gap-4">
                <div className="bg-blue-600/20 p-3 rounded-xl flex-shrink-0 border border-blue-500/30">
                  <Sparkles className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white mb-2">Về Dự Án</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Một hệ thống thông minh giúp bạn quản lý, tổ chức và kết nối các khái niệm từ tài liệu PDF. 
                    Sử dụng AI để tự động trích xuất và phân tích thông tin, tạo ra đồ thị tri thức trực quan.
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="grid grid-cols-2 gap-3">
              <div className="feature-card bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 hover:border-blue-500/50 transition-all hover-lift cursor-pointer">
                <div className="text-blue-400 text-sm font-bold mb-1">🧠 AI-Powered</div>
                <p className="text-xs text-slate-400">Trích xuất thông minh</p>
              </div>
              <div className="feature-card bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 hover:border-purple-500/50 transition-all hover-lift cursor-pointer">
                <div className="text-purple-400 text-sm font-bold mb-1">📊 Visualization</div>
                <p className="text-xs text-slate-400">Đồ thị tri thức trực quan</p>
              </div>
              <div className="feature-card bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 hover:border-pink-500/50 transition-all hover-lift cursor-pointer">
                <div className="text-pink-400 text-sm font-bold mb-1">📚 Management</div>
                <p className="text-xs text-slate-400">Quản lý tri thức hiệu quả</p>
              </div>
              <div className="feature-card bg-slate-900/40 border border-slate-700/50 rounded-lg p-3 hover:border-emerald-500/50 transition-all hover-lift cursor-pointer">
                <div className="text-emerald-400 text-sm font-bold mb-1">🚀 Innovation</div>
                <p className="text-xs text-slate-400">Công nghệ tiên tiến</p>
              </div>
            </div>
          </div>

          {/* Footer - Logo AZDIGI */}
          <div className="flex items-center gap-3 pt-8 border-t border-slate-700/50 opacity-70 hover:opacity-100 transition-opacity">
            <span className="text-sm text-slate-400">Tài trợ bởi</span>
            <img src={azdigi} alt="AZDIGI" className="h-8" />
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 relative z-10">
          <div className="w-full max-w-md bg-slate-900/80 backdrop-blur-xl p-8 rounded-2xl border border-slate-700 shadow-2xl slide-in-right pulse-glow">
            
            {/* Logo cho Mobile */}
            <div className="lg:hidden text-center mb-8">
              <div className="inline-flex items-center justify-center p-3 bg-blue-600/20 rounded-xl mb-4 pulse-glow border border-blue-500/30">
                <BrainCircuit className="w-10 h-10 text-blue-500" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">AI Personal Brain</h1>
              <p className="text-slate-400 text-sm">
                {isLogin ? 'Chào mừng trở lại!' : 'Khởi tạo bộ não số của bạn'}
              </p>
            </div>

            {/* Form Header - Desktop */}
            <div className="hidden lg:block mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
              </h2>
              <p className="text-slate-400 text-sm">
                {isLogin ? 'Quay lại với bộ não số của bạn' : 'Bắt đầu hành trình quản lý tri thức'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="relative group">
                  <User className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                  <input 
                    type="text" 
                    placeholder="Họ và tên"
                    className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none input-glow placeholder-slate-500"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              )}

              <div className="relative group">
                <Mail className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="email" 
                  placeholder="Email"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none input-glow placeholder-slate-500"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-3 top-3 text-slate-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  placeholder="Mật khẩu"
                  className="w-full bg-slate-950 border border-slate-700 text-white rounded-xl py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none input-glow placeholder-slate-500"
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-900/30 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 button-hover hover:shadow-blue-500/50 hover:shadow-lg"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    {isLogin ? 'Đăng Nhập' : 'Đăng Ký Ngay'} 
                    <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>

            {/* Toggle */}
            <div className="mt-6 text-center">
              <p className="text-slate-400 text-sm">
                {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                <button 
                  onClick={() => { setIsLogin(!isLogin); setError(''); }}
                  className="text-blue-400 font-bold ml-2 hover:text-blue-300 transition-colors hover:underline"
                >
                  {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
                </button>
              </p>
            </div>

            {/* Mobile - Contest Info */}
            <div className="lg:hidden mt-8 pt-6 border-t border-slate-700/50 text-center opacity-70 hover:opacity-100 transition-opacity">
              <p className="text-xs text-slate-400 mb-2">Tài trợ bởi</p>
              <img src={azdigi} alt="AZDIGI" className="h-6 mx-auto" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthPage;
# AI Personal Digital Brain 🧠

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/xuanthuc/ai-personal-brain/releases)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Production Ready](https://img.shields.io/badge/Production-Ready-success.svg)](PRODUCTION_READY.md)
[![Docker](https://img.shields.io/badge/Docker-Supported-blue.svg)](docker-compose.yml)

**Language / Ngôn ngữ:** [Tiếng Việt](#tieng-viet) | [English](#english)

<a id="tieng-viet"></a>

Nền tảng **"Bộ não số cá nhân"** hỗ trợ học tập và quản lý tri thức. Tích hợp Knowledge Graph, NLP nhẹ, và Gemini AI.

> 🎯 Cuộc thi **Website & AI Innovation Contest 2026** - Bảng B | v1.0.0 Official Release

## 📋 Nội dung
- [Tính năng](#tính-năng) | [Công nghệ](#công-nghệ) | [Cài đặt nhanh](#cài-đặt-nhanh) | [Production Deployment](#-production-deployment) | [Cấu trúc](#cấu-trúc-dự-án) | [API](#api-documentation) | [Giấy phép](#giấy-phép)

## ✨ Tính năng
- ✅ **Upload & quản lý PDF** - Với tự động trích xuất khái niệm
- ✅ **Knowledge Graph trực quan** - Biểu diễn mối quan hệ khái niệm bằng D3.js
- ✅ **Hỏi đáp AI thông minh** - Sử dụng NLP + Graph matching
- ✅ **NLP + Knowledge Graph** - Giảm 50% API calls so với thuần AI
- 🎯 **AI Learning Copilot** - Gợi ý học tập realtime, theo dõi chuỗi học (streak), nhắc ôn tập
- 🗺️ **Personalized Roadmap Generator** - Lộ trình học theo tuần, phân tích khoảng trống kiến thức
- 📝 **Batch Explanation Quiz** - Giải thích hàng loạt câu hỏi (1 AI call), tiết kiệm 56%+ tokens
- ✅ **JWT Authentication** - Bảo mật toàn vẹn
- ✅ **Dashboard thống kê** - Theo dõi tiến độ học tập
- ✅ **Multi-AI support** - Gemini 2.5 Flash + Groq Llama 3.1 fallback
- ✅ **Responsive Design** - Desktop, tablet, mobile

## 🚀 Công nghệ

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TailwindCSS, D3.js, Lucide Icons |
| **Backend** | Node.js 18+, Express 5, Prisma ORM, SQLite/PostgreSQL |
| **AI/NLP** | Google Gemini 2.5 Flash, Groq Llama 3.1, NLP lightweight |
| **Auth** | JWT + bcryptjs |
| **File Handling** | Multer, pdf-data-parser, Cloudinary |
| **Database** | SQLite (dev), PostgreSQL (prod) |

**Design Patterns**: Factory Pattern (AI providers), Repository Pattern (data access), Service Layer (business logic), Dependency Injection

## ⚡ Cài đặt nhanh (5 phút)

### Prerequisites
- Node.js 18+
- npm 9+

### Quick Start
```bash
# Clone repository
git clone https://github.com/xuanthuc/ai-personal-brain.git
cd ai-personal-brain

# Backend Setup
cd server
npm install
cp .env.example .env
# Edit .env with your API keys (see SETUP.md)
npx prisma migrate dev
npm start
# Server: http://localhost:5000

# Frontend Setup (new terminal)
cd client
npm install
# Edit .env with your API keys (see SETUP.md)
cp .env.example .env
npm run dev
# Frontend: http://localhost:5173
```

📖 **Detailed Guide**: [server/SETUP.md](server/SETUP.md)

## � Production Deployment

**Status: 100% Production Ready** ✅

### Docker Compose (Recommended)
```bash
# 1. Setup environment
cp .env.production.example .env
nano .env  # Fill in your API keys and secrets

# 2. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 3. Build and deploy
docker-compose build
docker-compose up -d

# 4. Verify
docker-compose ps
curl http://localhost:5000/health
```

### Manual VPS Deployment
```bash
# See detailed guide
cat DEPLOYMENT.md
```

**📚 Deployment Guides:**
- 📘 [DEPLOYMENT.md](DEPLOYMENT.md) - Full step-by-step guide for VPS
- ⚡ [QUICKSTART_PRODUCTION.md](QUICKSTART_PRODUCTION.md) - Quick reference
- ✅ [PRODUCTION_READY.md](PRODUCTION_READY.md) - Complete checklist
- ⚙️ [CI_CD_SETUP.md](CI_CD_SETUP.md) - CI/CD với GitHub Actions

**🐳 Docker Files:**
- [server/Dockerfile](server/Dockerfile) - Backend container
- [client/Dockerfile](client/Dockerfile) - Frontend with Nginx
- [docker-compose.yml](docker-compose.yml) - Full stack orchestration

**🔐 Production Features:**
- ✅ Winston logging with file rotation
- ✅ Health check endpoints
- ✅ Multi-stage Docker builds
- ✅ Non-root containers for security
- ✅ PostgreSQL with connection pooling
- ✅ Nginx reverse proxy
- ✅ Environment-based configuration
- ✅ Graceful shutdown handling

## �📁 Cấu trúc dự án

```
ai-personal-brain/
├── server/                  # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/         # DIContainer, Database config
│   │   ├── controllers/    # Auth, Documents, Subjects
│   │   ├── repositories/   # Data access (BaseRepository pattern)
│   │   ├── services/       # Business logic (AI, Auth, Document)
│   │   ├── factories/      # AIProviderFactory (Gemini/Groq)
│   │   ├── middleware/     # Auth, Error handling
│   │   ├── routes/         # API routes
│   │   ├── exceptions/     # Custom exceptions
│   │   ├── utils/          # Utilities
│   │   └── index.js        # Entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Prisma migrations
│   ├── SETUP.md            # Installation guide
│   ├── SECURITY.md         # Environment & secrets
│   ├── package.json        # Dependencies
│   └── .env.example        # Configuration template
│
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   │   ├── graph/      # Knowledge Graph visualization
│   │   │   ├── layout/     # Sidebar, Header
│   │   │   └── panels/     # ChatPanel, DocumentPanel, etc
│   │   ├── pages/          # Auth, Dashboard, Verify
│   │   ├── App.jsx         # Main app component
│   │   ├── main.jsx        # React entry point
│   │   └── index.css       # Tailwind styles
│   ├── public/             # Static files (pdf.worker.min.mjs)
│   ├── package.json        # Dependencies
│   ├── vite.config.js      # Vite configuration
│   └── tailwind.config.js  # Tailwind configuration
│
├── README.md               # This file
├── CHANGELOG.md            # Version history & release notes
├── LICENSE                 # MIT License
├── SECURITY.md            # Security configuration guide
└── .gitignore             # Git ignore rules
```

### Architecture Highlights
- **Factory Pattern**: `AIProviderFactory` cho Gemini/Groq
- **Repository Pattern**: Tách data access khỏi business logic
- **Service Layer**: Centralized AI, Auth, Document services
- **Dependency Injection**: `DIContainer` cho loose coupling
- **NLP + Graph Matching**: 50% cost reduction vs pure AI

## 🔌 API Documentation

### Authentication
```bash
POST /auth/register      # Đăng ký tài khoản
POST /auth/login         # Đăng nhập
GET  /auth/verify/:token # Xác nhận email
```

### Subjects (Môn học)
```bash
GET  /subjects           # Lấy tất cả môn học
GET  /subjects/:id       # Chi tiết môn học
POST /subjects           # Tạo môn học
POST /subjects/:id/ask   # Hỏi AI về môn học
```

### Documents (Tài liệu)
```bash
POST /documents/upload   # Upload PDF
GET  /documents          # Danh sách tài liệu
GET  /documents/:id      # Chi tiết tài liệu
```

### Knowledge Graph
```bash
GET  /graph              # Lấy graph (nodes + edges)
GET  /concepts           # Danh sách khái niệm
POST /concepts/:id/relations # Quan hệ khái niệm
```

### AI Learning Features
```bash
GET  /roadmap/:subjectId           # Lộ trình học cá nhân hóa (weekly)
GET  /roadmap/:subjectId/copilot   # Gợi ý học tập realtime + streak
POST /review/:subjectId/explanations # Giải thích batch (1 AI call)
```

**Full API Docs**: [server/SETUP.md#-api-endpoints](server/SETUP.md)

## 📦 Dependencies (v1.0.0)

### Server
```json
{
  "@google/generative-ai": "^0.24.1",
  "@prisma/client": "^5.10.0",
  "express": "^5.2.1",
  "groq-sdk": "^0.37.0",
  "bcryptjs": "^3.0.3",
  "jsonwebtoken": "^9.0.3",
  "multer": "^2.0.2",
  "pdf-data-parser": "^1.2.20"
}
```

### Client
```json
{
  "react": "^19.2.0",
  "react-dom": "^19.2.0",
  "vite": "^7.2.4",
  "tailwindcss": "^3.4.17",
  "d3-force": "^3.0.0",
  "axios": "^1.13.4"
}
```

See [server/package.json](server/package.json) and [client/package.json](client/package.json) for all dependencies.

## 🔐 Security

**Environment Variables** (see [SECURITY.md](server/SECURITY.md)):
- `JWT_SECRET` - Generate with secure script
- `GOOGLE_API_KEY` - Gemini API key
- `GROQ_API_KEY` - Groq API key
- `DATABASE_URL` - Database connection
- `.env` file is **NOT** committed (see `.gitignore`)

**Best Practices**:
- All secrets in `.env` (never commit)
- Use `.env.example` as template for team
- Generate secure JWT_SECRET before production
- CORS configured per environment

See [server/SECURITY.md](server/SECURITY.md) for detailed security guide.

## 📝 Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview & quick start |
| [server/SETUP.md](server/SETUP.md) | Detailed installation & troubleshooting |
| [server/SECURITY.md](server/SECURITY.md) | Environment & security configuration || [DEPLOYMENT.md](DEPLOYMENT.md) | **VPS production deployment guide** |
| [QUICKSTART_PRODUCTION.md](QUICKSTART_PRODUCTION.md) | **Quick production deployment** |
| [PRODUCTION_READY.md](PRODUCTION_READY.md) | **Production readiness checklist** || [CHANGELOG.md](CHANGELOG.md) | Version history & release notes |
| [LICENSE](LICENSE) | MIT License (OSI-approved) |

## 🧪 Testing

### Verify Installation
```bash
# Check versions
node --version   # v18+
npm --version    # v9+

# Test API
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

## 📊 Release Information

- **Version**: 1.0.0 (Production Ready)
- **Release Date**: February 2026
- **License**: MIT (OSI-approved)
- **Status**: ✅ **100% Production Ready** - Deploy Now!

**Production Features:**
- ✅ Docker containerization
- ✅ Winston logging system
- ✅ Health check endpoints
- ✅ PostgreSQL support
- ✅ Security hardening complete
- ✅ Full deployment documentation

**Deploy Guide**: See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step VPS deployment.

**Changelog**: See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## 🤝 Contributing

This project is released as open source under MIT license.

For issues or suggestions:
1. Check [Troubleshooting](server/SETUP.md#-troubleshooting)
2. Open GitHub issue: https://github.com/xuanthuc/ai-personal-brain/issues
3. Submit pull request for improvements

## 📜 License

MIT License - Open source approved by OSI

See [LICENSE](LICENSE) for full details.

---

## 📞 Contact & Links

- **Repository**: https://github.com/xuanthuc/ai-personal-brain
- **Author**: Xuan Thuc
- **Contest**: Website & AI Innovation Contest 2026 - Bảng B

---

Made with ❤️ | ⭐ Star if you like it!

---

<a id="english"></a>

## English

AI Personal Digital Brain is a platform for learning and personal knowledge management. It integrates a Knowledge Graph, lightweight NLP, and Gemini AI.

> 🎯 Website & AI Innovation Contest 2026 - Group B | v1.0.0 Official Release

## Table of Contents
- [Features](#features) | [Tech Stack](#tech-stack) | [Quick Start](#quick-start) | [Production Deployment](#-production-deployment) | [Project Structure](#project-structure) | [API](#api) | [License](#license)

## Features
- ✅ **PDF Upload & Management** - Automatic concept extraction
- ✅ **Interactive Knowledge Graph** - Visualized with D3.js
- ✅ **Smart AI Q&A** - NLP + Graph matching
- ✅ **NLP + Knowledge Graph** - 50% fewer AI calls vs pure AI
- 🎯 **AI Learning Copilot** - Realtime suggestions, study streak tracking, review reminders
- 🗺️ **Personalized Roadmap Generator** - Weekly learning paths, knowledge gap analysis
- 📝 **Batch Explanation Quiz** - Bulk explanations (1 AI call), saves 56%+ tokens
- ✅ **JWT Authentication** - Secure access
- ✅ **Dashboard Analytics** - Study progress tracking
- ✅ **Multi-AI Support** - Gemini 2.5 Flash + Groq Llama 3.1 fallback
- ✅ **Responsive Design** - Desktop, tablet, mobile

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, Vite, TailwindCSS, D3.js, Lucide Icons |
| **Backend** | Node.js 18+, Express 5, Prisma ORM, SQLite/PostgreSQL |
| **AI/NLP** | Google Gemini 2.5 Flash, Groq Llama 3.1, NLP lightweight |
| **Auth** | JWT + bcryptjs |
| **File Handling** | Multer, pdf-data-parser, Cloudinary |
| **Database** | SQLite (dev), PostgreSQL (prod) |

**Design Patterns**: Factory Pattern (AI providers), Repository Pattern (data access), Service Layer (business logic), Dependency Injection

## Quick Start (5 minutes)

### Prerequisites
- Node.js 18+
- npm 9+

### Quick Start
```bash
# Clone repository
git clone https://github.com/xuanthuc/ai-personal-brain.git
cd ai-personal-brain

# Backend Setup
cd server
npm install
cp .env.example .env
# Edit .env with your API keys (see SETUP.md)
npx prisma migrate dev
npm start
# Server: http://localhost:5000

# Frontend Setup (new terminal)
cd client
npm install
# Edit .env with your API keys (see SETUP.md)
cp .env.example .env
npm run dev
# Frontend: http://localhost:5173
```

📖 **Detailed Guide**: [server/SETUP.md](server/SETUP.md)

## Project Structure

```
ai-personal-brain/
├── server/                  # Backend (Node.js + Express)
│   ├── src/
│   │   ├── config/         # DIContainer, Database config
│   │   ├── controllers/    # Auth, Documents, Subjects
│   │   ├── repositories/   # Data access (BaseRepository pattern)
│   │   ├── services/       # Business logic (AI, Auth, Document)
│   │   ├── factories/      # AIProviderFactory (Gemini/Groq)
│   │   ├── middleware/     # Auth, Error handling
│   │   ├── routes/         # API routes
│   │   ├── exceptions/     # Custom exceptions
│   │   ├── utils/          # Utilities
│   │   └── index.js        # Entry point
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── migrations/     # Prisma migrations
│   ├── SETUP.md            # Installation guide
│   ├── SECURITY.md         # Environment & secrets
│   ├── package.json        # Dependencies
│   └── .env.example        # Configuration template
│
├── client/                 # Frontend (React + Vite)
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Auth, Dashboard, Verify
│   │   ├── App.jsx         # Main app component
│   │   ├── main.jsx        # React entry point
│   │   └── index.css       # Tailwind styles
│   ├── public/             # Static files
│   ├── package.json        # Dependencies
│   ├── vite.config.js      # Vite configuration
│   └── tailwind.config.js  # Tailwind configuration
│
├── README.md               # This file
├── CHANGELOG.md            # Version history & release notes
├── LICENSE                 # MIT License
├── SECURITY.md            # Security configuration guide
└── .gitignore             # Git ignore rules
```

## API

### Authentication
```bash
POST /auth/register      # Register user
POST /auth/login         # Login
GET  /auth/verify/:token # Verify email
```

### Subjects
```bash
GET  /subjects           # Get all subjects
GET  /subjects/:id       # Subject details
POST /subjects           # Create subject
POST /subjects/:id/ask   # Ask AI about subject
```

### Documents
```bash
POST /documents/upload   # Upload PDF
GET  /documents          # List documents
GET  /documents/:id      # Document details
```

### Knowledge Graph
```bash
GET  /graph              # Get graph (nodes + edges)
GET  /concepts           # List concepts
POST /concepts/:id/relations # Concept relations
```

### AI Learning Features
```bash
GET  /roadmap/:subjectId           # Personalized learning roadmap (weekly)
GET  /roadmap/:subjectId/copilot   # Realtime learning suggestions + streak
POST /review/:subjectId/explanations # Batch explanations (1 AI call)
```

**Full API Docs**: [server/SETUP.md#-api-endpoints](server/SETUP.md)

## Security

**Environment Variables** (see [SECURITY.md](server/SECURITY.md)):
- `JWT_SECRET` - Generate with secure script
- `GOOGLE_API_KEY` - Gemini API key
- `GROQ_API_KEY` - Groq API key
- `DATABASE_URL` - Database connection
- `.env` file is **NOT** committed (see .gitignore)

**Best Practices**:
- Keep all secrets in `.env` (never commit)
- Use `.env.example` as a team template
- Generate a strong `JWT_SECRET` before production
- Configure CORS per environment

## Documentation

| Document | Purpose |
|----------|---------|
| [README.md](README.md) | Project overview & quick start |
| [server/SETUP.md](server/SETUP.md) | Detailed installation & troubleshooting |
| [server/SECURITY.md](server/SECURITY.md) | Environment & security configuration || [DEPLOYMENT.md](DEPLOYMENT.md) | **VPS production deployment guide** |
| [QUICKSTART_PRODUCTION.md](QUICKSTART_PRODUCTION.md) | **Quick production deployment** |
| [PRODUCTION_READY.md](PRODUCTION_READY.md) | **Production readiness checklist** || [CHANGELOG.md](CHANGELOG.md) | Version history & release notes |
| [LICENSE](LICENSE) | MIT License (OSI-approved) |

## Testing

### Verify Installation
```bash
# Check versions
node --version   # v18+
npm --version    # v9+

# Test API
curl -X POST http://localhost:5000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'
```

## Release Information

- **Version**: 1.0.0 (Production Ready)
- **Release Date**: February 2026
- **License**: MIT (OSI-approved)
- **Status**: ✅ **100% Production Ready** - Deploy Now!

**Production Features:**
- ✅ Docker containerization
- ✅ Winston logging system
- ✅ Health check endpoints
- ✅ PostgreSQL support
- ✅ Security hardening complete
- ✅ Full deployment documentation

**Deploy Guide**: See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step VPS deployment.

**Changelog**: See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Contributing

This project is released as open source under the MIT license.

For issues or suggestions:
1. Check [Troubleshooting](server/SETUP.md#-troubleshooting)
2. Open GitHub issue: https://github.com/xuanthuc/ai-personal-brain/issues
3. Submit a pull request

## License

MIT License - Open source approved by OSI

See [LICENSE](LICENSE) for full details.

---

## Contact & Links

- **Repository**: https://github.com/xuanthuc/ai-personal-brain
- **Author**: Xuan Thuc
- **Contest**: Website & AI Innovation Contest 2026 - Group B

---

Made with ❤️ | ⭐ Star if you like it!
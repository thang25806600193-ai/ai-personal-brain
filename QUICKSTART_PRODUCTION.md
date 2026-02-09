# Production Deployment Quick Start

## Method 1: Docker Compose (Recommended)

```bash
# 1. Clone and navigate
git clone https://github.com/xuanthuc/ai-personal-brain.git
cd ai-personal-brain

# 2. Setup environment
cp .env.production.example .env
nano .env  # Fill in your values

# 3. Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy to .env JWT_SECRET

# 4. Build and run
docker-compose build
docker-compose up -d

# 5. Verify
docker-compose ps
curl http://localhost:5000/health
```

## Method 2: Manual VPS Setup

```bash
# 1. Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install nodejs -y

# 2. Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# 3. Clone and install
git clone https://github.com/xuanthuc/ai-personal-brain.git
cd ai-personal-brain
npm run install-all

# 4. Setup database
sudo -u postgres psql
CREATE DATABASE ai_personal_brain;
CREATE USER ai_brain_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE ai_personal_brain TO ai_brain_user;
\q

# 5. Configure environment
cd server
cp .env.example .env
nano .env
# Update DATABASE_URL, JWT_SECRET, API keys

# 6. Run migrations
npx prisma generate
npx prisma migrate deploy

# 7. Build client
cd ../client
npm run build

# 8. Start server (use PM2)
npm install -g pm2
cd ../server
pm2 start src/index.js --name ai-brain-server
pm2 save
pm2 startup
```

## Environment Variables (Critical)

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@localhost:5432/ai_personal_brain
JWT_SECRET=<64-char-random-string>
GOOGLE_API_KEY=<your-key>
GROQ_API_KEY=<your-key>
FRONTEND_URL=https://your-domain.com
```

## SSL Setup (Let's Encrypt)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## Monitoring

```bash
# View logs
docker-compose logs -f

# Or with PM2
pm2 logs ai-brain-server
```

📖 **Full guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)

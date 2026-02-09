# 🚀 HƯỚNG DẪN DEPLOY LÊN VPS PRODUCTION

Hướng dẫn chi tiết để deploy **AI Personal Brain** lên VPS production với Docker.

---

## 📋 YÊU CẦU HỆ THỐNG

### VPS Tối thiểu:
- **CPU**: 2 cores
- **RAM**: 4GB
- **Storage**: 20GB SSD
- **OS**: Ubuntu 20.04+ / Debian 11+
- **Network**: Public IP address

### Phần mềm cần cài:
- Docker 24+
- Docker Compose 2.20+
- Git
- (Optional) Nginx for reverse proxy

---

## 🔧 BƯỚC 1: CHUẨN BỊ VPS

### 1.1. Kết nối SSH vào VPS
```bash
ssh root@your-vps-ip
# hoặc
ssh user@your-vps-ip
```

### 1.2. Update hệ thống
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3. Cài đặt Docker
```bash
# Cài Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Thêm user vào docker group
sudo usermod -aG docker $USER

# Cài Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### 1.4. Cài Git
```bash
sudo apt install git -y
git --version
```

---

## 📦 BƯỚC 2: CLONE VÀ CẤU HÌNH DỰ ÁN

### 2.1. Clone repository
```bash
cd /opt
sudo git clone https://github.com/xuanthuc/ai-personal-brain.git
cd ai-personal-brain
sudo chown -R $USER:$USER .
```

### 2.2. Tạo file `.env` từ template
```bash
cp .env.production.example .env
```

### 2.3. Cấu hình `.env` file
```bash
nano .env
# hoặc
vim .env
```

**Điền các giá trị quan trọng:**

```env
# Database
POSTGRES_PASSWORD=your_strong_password_here_min_16_chars

# Security - CRITICAL!
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# AI APIs
GOOGLE_API_KEY=your_google_gemini_api_key
GROQ_API_KEY=your_groq_api_key

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_secret

# Email
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Domains
FRONTEND_URL=http://your-vps-ip
APP_BASE_URL=http://your-vps-ip
VITE_API_BASE_URL=http://your-vps-ip:5000

# Google OAuth
VITE_GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
```

**🔐 Tạo JWT_SECRET an toàn:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Copy kết quả vào JWT_SECRET
```

---

## 🐳 BƯỚC 3: BUILD VÀ CHẠY DOCKER

### 3.1. Build Docker images
```bash
docker-compose build
```

Quá trình build mất 5-10 phút tùy VPS.

### 3.2. Chạy containers
```bash
docker-compose up -d
```

### 3.3. Kiểm tra containers
```bash
docker-compose ps
```

Kết quả mong đợi:
```
NAME                  STATUS              PORTS
ai-brain-postgres     Up (healthy)        0.0.0.0:5432->5432/tcp
ai-brain-server       Up (healthy)        0.0.0.0:5000->5000/tcp
ai-brain-client       Up                  0.0.0.0:80->80/tcp
```

### 3.4. Xem logs
```bash
# Tất cả services
docker-compose logs -f

# Chỉ server
docker-compose logs -f server

# Chỉ client
docker-compose logs -f client
```

---

## ✅ BƯỚC 4: VERIFY DEPLOYMENT

### 4.1. Health checks
```bash
# Server health
curl http://localhost:5000/health

# Client health
curl http://localhost/health
```

### 4.2. Test API
```bash
curl http://localhost:5000/api/subjects
# Expect: 401 Unauthorized (chứng tỏ API đang chạy)
```

### 4.3. Truy cập từ browser
- Frontend: `http://your-vps-ip`
- Backend: `http://your-vps-ip:5000`

---

## 🔒 BƯỚC 5: SETUP HTTPS (KHUYẾN NGHỊ)

### 5.1. Cài Nginx (nếu chưa có)
```bash
sudo apt install nginx -y
```

### 5.2. Tạo Nginx config
```bash
sudo nano /etc/nginx/sites-available/ai-brain
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $host;
    }
}
```

### 5.3. Enable config
```bash
sudo ln -s /etc/nginx/sites-available/ai-brain /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5.4. Cài SSL với Let's Encrypt
```bash
# Cài Certbot
sudo apt install certbot python3-certbot-nginx -y

# Lấy SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal
sudo systemctl enable certbot.timer
```

---

## 🔄 BƯỚC 6: QUẢN LÝ VÀ BẢO TRÌ

### 6.1. Restart services
```bash
docker-compose restart
```

### 6.2. Stop services
```bash
docker-compose down
```

### 6.3. Update code
```bash
git pull origin main
docker-compose down
docker-compose build
docker-compose up -d
```

### 6.4. Backup database
```bash
# Tự động backup
docker exec ai-brain-postgres pg_dump -U postgres ai_personal_brain > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i ai-brain-postgres psql -U postgres ai_personal_brain < backup_20260209.sql
```

### 6.5. View logs
```bash
# Real-time logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f server
```

### 6.6. Clean up
```bash
# Remove unused images
docker image prune -a

# Remove unused volumes
docker volume prune
```

---

## 🔥 TROUBLESHOOTING

### Problem: Container không start
```bash
# Check logs
docker-compose logs server

# Restart
docker-compose restart server
```

### Problem: Database connection failed
```bash
# Check database
docker exec -it ai-brain-postgres psql -U postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Problem: Port already in use
```bash
# Find process using port
sudo lsof -i :5000
sudo lsof -i :80

# Kill process
sudo kill -9 <PID>
```

### Problem: Out of memory
```bash
# Check memory
free -h

# Add swap
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 📊 MONITORING & ALERTING

### 6.1. Setup monitoring với Uptime Kuma
```bash
docker run -d --restart=always -p 3001:3001 -v uptime-kuma:/app/data --name uptime-kuma louislam/uptime-kuma:1
```

Truy cập: `http://your-vps-ip:3001`

### 6.2. Health check endpoints
- Server: `http://your-vps-ip:5000/health`
- Client: `http://your-vps-ip/health`

---

## 🔐 SECURITY CHECKLIST

- [x] JWT_SECRET đã được generate random
- [x] POSTGRES_PASSWORD đã được đổi
- [x] .env không được commit lên Git
- [x] Firewall đã được config (chỉ mở port 80, 443, 22)
- [x] SSL certificate đã được cài (HTTPS)
- [x] Rate limiting đã enable
- [x] Helmet security headers đã enable
- [x] Database chỉ accessible từ container network

### Setup UFW Firewall
```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 📈 PRODUCTION TIPS

### 1. Auto-start on reboot
Docker containers đã có `restart: unless-stopped` trong docker-compose.yml

### 2. Log rotation
```bash
# Docker log config
sudo nano /etc/docker/daemon.json
```
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```
```bash
sudo systemctl restart docker
```

### 3. Performance tuning
- Tăng RAM cho database: Edit docker-compose.yml
- Enable Redis cache (optional)
- Use CDN cho static files (Cloudflare)

### 4. Backup strategy
- Database: Daily backup
- Uploads folder: Daily backup
- .env file: Secure backup offline

---

## 🎯 DEPLOYMENT CHECKLIST

**Pre-deployment:**
- [ ] `.env` đã được config đầy đủ
- [ ] JWT_SECRET đã được generate
- [ ] Database password đã được đổi
- [ ] API keys đã được setup
- [ ] Domain/IP đã được config trong .env

**Deployment:**
- [ ] `docker-compose build` thành công
- [ ] `docker-compose up -d` thành công
- [ ] Tất cả containers đang chạy (healthy)
- [ ] Health check endpoints trả về 200
- [ ] Frontend accessible từ browser
- [ ] Backend API responding

**Post-deployment:**
- [ ] SSL certificate đã được cài
- [ ] Firewall đã được config
- [ ] Monitoring đã được setup
- [ ] Backup script đã được schedule
- [ ] Logs đang được ghi đúng

---

## 📞 SUPPORT

Nếu gặp vấn đề:
1. Check logs: `docker-compose logs -f`
2. Check health: `curl http://localhost:5000/health`
3. Restart services: `docker-compose restart`
4. GitHub Issues: https://github.com/xuanthuc/ai-personal-brain/issues

---

## 🎉 KẾT LUẬN

Chúc mừng! 🎊 Bạn đã deploy thành công AI Personal Brain lên production VPS.

**Next steps:**
- Setup monitoring & alerting
- Configure automated backups
- Optimize performance
- Add more features

**Production URL:**
- Frontend: `https://your-domain.com`
- Backend: `https://your-domain.com/api`

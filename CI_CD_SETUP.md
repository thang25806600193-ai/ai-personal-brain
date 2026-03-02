# ⚙️ CI/CD Setup (GitHub Actions)

Repo này đã được thêm 2 workflow:

- `.github/workflows/ci.yml`: chạy CI cho client + server.
- `.github/workflows/cd.yml`: deploy VPS tự động khi CI pass trên nhánh `main`.

---

## 1) CI đang chạy gì?

### Client
- `npm ci`
- `npm run lint`
- `npm run build`

### Server
- `npm ci`
- `npm run generate` (Prisma generate check)

---

## 2) CD hoạt động thế nào?

- Trigger: khi workflow `CI` hoàn tất thành công trên nhánh `main`.
- Hành động trên VPS:
  - `git fetch --all && git reset --hard origin/main`
  - `docker compose up -d --build --remove-orphans` (hoặc `docker-compose` nếu server cũ)
  - Chạy health-check sau deploy (retry tối đa 12 lần, mỗi lần cách 5 giây)
  - `docker image prune -f`

---

## 3) Cấu hình GitHub Secrets

Vào **GitHub Repo → Settings → Secrets and variables → Actions** và thêm:

- `SSH_HOST`: IP/Domain VPS
- `SSH_USER`: user SSH (ví dụ `root` hoặc `deploy`)
- `SSH_PRIVATE_KEY`: private key dùng để SSH (nội dung đầy đủ, multi-line)
- `SSH_PORT`: cổng SSH (thường `22`)
- `DEPLOY_PATH`: đường dẫn project trên VPS (ví dụ `/opt/ai-personal-brain`)
- `HEALTHCHECK_URL` (optional): endpoint để kiểm tra sau deploy (mặc định `http://localhost:5000/health`)

Khuyến nghị đặt các secrets này ở **Environment `production`** để kiểm soát tốt hơn.

---

## 4) Chuẩn bị VPS trước lần deploy đầu

1. Clone repo vào đúng `DEPLOY_PATH`.
2. Cài Docker + Docker Compose.
3. Đảm bảo user SSH có quyền chạy Docker.
4. Tạo file môi trường production (`.env`/`client/.env` theo hướng dẫn deploy của repo).

---

## 4.1) Nếu dự án đã deploy và đang chạy production

Bạn có thể bật CI/CD mà **không cần redeploy tay ngay**:

1. Giữ nguyên containers đang chạy hiện tại.
2. Chỉ thêm GitHub Secrets (mục 3).
3. Tạo một commit nhỏ (ví dụ update docs) và merge vào `main` để test pipeline.
4. Theo dõi GitHub Actions + `docker compose ps` + logs trên VPS.

### Checklist an toàn trước khi bật CD
- Confirm `DEPLOY_PATH` trỏ đúng thư mục project đang chạy.
- Confirm user SSH có quyền docker (`docker ps` chạy được không cần sudo).
- Đảm bảo file `.env` trên VPS đã đúng và còn hiệu lực.
- Chụp backup DB trước lần chạy CD đầu tiên.

### Giảm rủi ro downtime
- Deploy vào khung giờ tải thấp.
- Merge từng thay đổi nhỏ thay vì big-bang.
- Luôn theo dõi endpoint health ngay sau deploy (`/health`).

---

## 5) Bảo mật bắt buộc

Nên chuyển toàn bộ secrets sang:
- file `.env` trên VPS (không commit), hoặc
- GitHub Secrets + inject khi deploy.

Nếu không chuyển, CI/CD vẫn chạy nhưng có rủi ro lộ credentials nghiêm trọng.

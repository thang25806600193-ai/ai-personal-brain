// server/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Tạo user giả
  const user = await prisma.user.upsert({
    where: { email: 'test@student.hutech.edu.vn' },
    update: {},
    create: {
      id: 'demo-user',
      email: 'test@student.hutech.edu.vn',
      password: '123',
      name: 'Xuân Thực'
    },
  });
  console.log('Đã tạo User mẫu:', user);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
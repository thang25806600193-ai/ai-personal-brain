/**
 * Database Configuration
 * Singleton pattern - đảm bảo chỉ có 1 instance PrismaClient
 * DIP: Depend on this module, không depend trực tiếp trên PrismaClient
 */

const { PrismaClient } = require('@prisma/client');

let prismaInstance = null;

/**
 * Lấy Prisma instance (Singleton)
 * @returns {PrismaClient}
 */
const getPrismaClient = () => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error'],
      // Connection pool configuration for production stability
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Handle connection errors
    prismaInstance.$connect()
      .then(() => {
        console.log('✅ Database connected successfully');
      })
      .catch((error) => {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
      });
  }
  return prismaInstance;
};

/**
 * Đóng kết nối database
 */
const closePrismaClient = async () => {
  if (prismaInstance) {
    await prismaInstance.$disconnect();
    console.log('✅ Database disconnected');
    prismaInstance = null;
  }
};

module.exports = {
  getPrismaClient,
  closePrismaClient,
};

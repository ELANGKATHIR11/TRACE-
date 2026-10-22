const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const result = await prisma.$queryRawUnsafe('SELECT 1 as result');
    console.log('Database connected successfully:', result);
    const userCount = await prisma.user.count();
    console.log('User count in DB:', userCount);
  } catch (error) {
    console.error('Database connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();

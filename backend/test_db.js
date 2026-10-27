import { PrismaClient } from '@prisma/client';

async function main() {
  const url1 = 'postgresql://neondb_owner:npg_0Pn7TZdayReh@ep-noisy-shape-ao7hpr7e-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';
  const prisma = new PrismaClient({ datasources: { db: { url: url1 } } });
  try {
    const user = await prisma.user.findFirst();
    console.log('Connected! User:', user ? user.email : 'No user');
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

const prisma = new PrismaClient();

const org = await prisma.organization.findUnique({ where: { code: 'AGRI_CORP' } });
const customer = await prisma.customer.findFirst({ where: { organizationId: org.id, name: 'Golden Agro Ltd.' } });
if (customer) {
  const result = await prisma.customerCredit.update({
    where: { customerId: customer.id },
    data: { creditLimit: 15000000, outstandingAmount: 0 }
  });
  console.log('✅ Credit limit updated to:', result.creditLimit, '(₹1,50,00,000)');
} else {
  console.log('❌ Customer not found');
}
await prisma.$disconnect();
